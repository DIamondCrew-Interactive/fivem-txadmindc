'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');

const discordIdPattern = /^[0-9]{17,20}$/;
const requestIdPattern = /^[A-Za-z0-9_-]{12,80}$/;
const banIdPattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const serverIdPattern = /^[a-z0-9][a-z0-9-]{1,39}$/;
const apiBase = '/v1/moderation/bans';
const maxDuration = 10 * 366 * 86400;
const attachedDatabases = new Set();

class RequestError extends Error {
    constructor(status, code) {
        super(code);
        this.status = status;
    }
}

function writeAtomic(filename, data) {
    const directory = path.dirname(filename);
    const temp = path.join(directory, `.pm-db-${crypto.randomUUID()}.tmp`);
    let fd;
    let renamed = false;
    try {
        const mode = (fs.statSync(filename, { throwIfNoEntry: false })?.mode ?? 0o600) & 0o777;
        fd = fs.openSync(temp, 'wx', 0o600);
        fs.fchmodSync(fd, mode);
        fs.writeFileSync(fd, data);
        fs.fsyncSync(fd);
        fs.closeSync(fd);
        fd = undefined;
        fs.renameSync(temp, filename);
        renamed = true;
        const dirFd = fs.openSync(directory, 'r');
        try {
            fs.fsyncSync(dirFd);
        } finally {
            fs.closeSync(dirFd);
        }
        return true;
    } catch (error) {
        if (!renamed) throw error;
        // Rename committed. Callers must keep in-memory data consistent with the file.
        return false;
    } finally {
        if (fd !== undefined) fs.closeSync(fd);
        if (!renamed) {
            try { fs.unlinkSync(temp); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        }
    }
}

function writeDatabase(filename, serialized, originalWrite) {
    if (!attachedDatabases.has(filename)) return originalWrite();
    if (!writeAtomic(filename, serialized)) throw new Error('Moderation database sync uncertain');
}

function registerNativeBan(db, ban) {
    if (!attachedDatabases.has(db.dbPath)) return false;
    const data = db.obj.data;
    const durable = writeAtomic(db.dbPath, JSON.stringify({ ...data, actions: [...data.actions, ban] }));
    data.actions.push(ban);
    if (!durable) throw new Error('Ban saved, but directory sync was not confirmed');
    return true;
}

function revokeNativeBan(db, ban, revocation) {
    if (ban.type !== 'ban' || !attachedDatabases.has(db.dbPath)) return false;
    const data = db.obj.data;
    const actions = data.actions.map(action => action === ban ? { ...ban, revocation } : action);
    const durable = writeAtomic(db.dbPath, JSON.stringify({ ...data, actions }));
    ban.revocation = revocation;
    if (!durable) throw new Error('Revocation saved, but directory sync was not confirmed');
    return true;
}

function revisionOf(ban) {
    return ban.prismaticExpiryChanges?.length ?? 0;
}

function projectChange(change) {
    return {
        ...change,
        kind: change.expiresAt < change.previousExpiresAt ? 'shortened' : 'extended',
    };
}

function projectBan(ban, now) {
    const discordIds = [...new Set(ban.ids.filter(id => typeof id === 'string' && id.startsWith('discord:'))
        .map(id => id.slice(8)).filter(id => discordIdPattern.test(id)))];
    const permanent = ban.expiration === false;
    const revokedAt = ban.revocation?.timestamp || false;
    const lastChange = ban.prismaticExpiryChanges?.at(-1);
    return {
        banId: ban.id,
        discordId: discordIds.length === 1 ? discordIds[0] : false,
        discordMatch: discordIds.length === 1 ? 'unique' : discordIds.length ? 'ambiguous' : 'missing',
        playerName: ban.playerName && ban.playerName !== 'identifiers' ? ban.playerName : false,
        reason: ban.reason,
        issuedBy: ban.author || false,
        issuedAt: ban.timestamp,
        expiresAt: ban.expiration,
        permanent,
        durationSeconds: permanent ? false : ban.expiration - ban.timestamp,
        revokedAt,
        revokedBy: revokedAt ? ban.revocation.author || false : false,
        status: revokedAt ? 'revoked' : permanent || ban.expiration > now ? 'active' : 'expired',
        revision: revisionOf(ban),
        lastChange: lastChange ? projectChange(lastChange) : false,
    };
}

function changeExpiry(db, serverId, operators, banId, input, now, persist = writeAtomic) {
    if (!input || Array.isArray(input) || typeof input !== 'object' || input.serverId !== serverId ||
        typeof input.requestId !== 'string' || !requestIdPattern.test(input.requestId) ||
        typeof input.actorDiscordId !== 'string' || !discordIdPattern.test(input.actorDiscordId) ||
        !Number.isSafeInteger(input.expiresAt) || !Number.isSafeInteger(input.expectedExpiresAt) ||
        !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0 ||
        typeof input.reason !== 'string' || input.reason.trim().length < 3 || input.reason.length > 500) {
        throw new RequestError(400, 'invalid_request');
    }
    if (!operators.has(input.actorDiscordId)) throw new RequestError(403, 'operator_not_allowed');

    const data = db.obj.data;
    const ban = data.actions.find(action => action.type === 'ban' && action.id === banId);
    if (!ban) throw new RequestError(404, 'ban_not_found');
    const changes = ban.prismaticExpiryChanges ?? [];
    const reason = input.reason.trim();
    const previous = changes.find(change => change.requestId === input.requestId);
    if (previous) {
        if (previous.actorDiscordId !== input.actorDiscordId || previous.expiresAt !== input.expiresAt ||
            previous.previousExpiresAt !== input.expectedExpiresAt || previous.revision !== input.expectedRevision + 1 ||
            previous.reason !== reason) throw new RequestError(409, 'request_id_reused');
        // Retry after lost response or uncertain sync. Serialize the current state, never an older revision.
        if (!persist(db.dbPath, JSON.stringify(data))) throw new RequestError(503, 'persistence_uncertain');
        return { replayed: true, change: projectChange(previous), ban: projectBan(ban, now) };
    }
    if (ban.expiration === false || ban.revocation?.timestamp || ban.expiration <= now) {
        throw new RequestError(409, 'ban_not_active_temporary');
    }
    if (ban.expiration !== input.expectedExpiresAt || revisionOf(ban) !== input.expectedRevision) {
        throw new RequestError(409, 'ban_changed');
    }
    if (input.expiresAt <= now || input.expiresAt > now + maxDuration || input.expiresAt === ban.expiration) {
        throw new RequestError(400, 'invalid_new_expiry');
    }

    const change = {
        requestId: input.requestId,
        actorDiscordId: input.actorDiscordId,
        previousExpiresAt: ban.expiration,
        expiresAt: input.expiresAt,
        changedAt: now,
        reason,
        revision: changes.length + 1,
    };
    const updated = { ...ban, expiration: input.expiresAt, prismaticExpiryChanges: [...changes, change] };
    const next = { ...data, actions: data.actions.map(action => action === ban ? updated : action) };
    const durable = persist(db.dbPath, JSON.stringify(next));
    // txAdmin's lowdb chain retains this object. Update in place after the atomic rename.
    Object.assign(ban, updated);
    if (!durable) throw new RequestError(503, 'persistence_uncertain');
    return { replayed: false, change: projectChange(change), ban: projectBan(ban, now) };
}

function send(res, status, data) {
    if (res.destroyed) return;
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
}

async function readInput(req) {
    if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
        throw new RequestError(415, 'expected_json');
    }
    let bytes = 0;
    const chunks = [];
    for await (const chunk of req.iterator({ destroyOnReturn: false })) {
        bytes += chunk.length;
        if (bytes > 8192) throw new RequestError(413, 'request_too_large');
        chunks.push(chunk);
    }
    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
        throw new RequestError(400, 'invalid_json');
    }
}

function attach(db) {
    const directory = path.resolve(path.dirname(db.dbPath), '..', 'pm-moderation');
    const configPath = path.join(directory, 'config.json');
    if (!fs.existsSync(configPath)) return;
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (typeof config.serverId !== 'string' || !serverIdPattern.test(config.serverId) || !Array.isArray(config.operators) ||
            !config.operators.every(id => typeof id === 'string' && discordIdPattern.test(id))) {
            throw new Error('invalid moderation configuration');
        }
        const operators = new Set(config.operators);
        const sockets = ['read', 'write'].map(mode => {
            const dir = path.join(directory, mode);
            const stat = fs.lstatSync(dir);
            if (!stat.isDirectory() || stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) {
                throw new Error('unsafe moderation socket directory');
            }
            return { mode, filename: path.join(dir, 'api.sock') };
        });
        function listener(mode) {
            return http.createServer({
            maxHeaderSize: 4096,
            headersTimeout: 5000,
            requestTimeout: 10000,
        }, async (req, res) => {
            const relative = req.url.startsWith(`${apiBase}/`) ? req.url.slice(apiBase.length + 1) : '';
            const [auditId, auditSuffix, extra] = relative.split('/');
            const audit = req.method === 'GET' && banIdPattern.test(auditId) && auditSuffix === 'audit' && extra === undefined;
            const isRead = req.method === 'GET' && (req.url === apiBase || audit);
            const id = req.method === 'PATCH' && req.url.startsWith(`${apiBase}/`) ? relative : '';
            if (!isRead && !banIdPattern.test(id)) return send(res, 404, { error: 'not_found' });
            if ((isRead ? 'read' : 'write') !== mode) return send(res, 403, { error: 'wrong_socket' });
            try {
                const input = isRead ? null : await readInput(req);
                if (!db.isReady || !db.obj?.data) throw new RequestError(503, 'database_unavailable');
                const observedAt = Math.floor(Date.now() / 1000);
                if (isRead) {
                    if (audit) {
                        const ban = db.obj.data.actions.find(action => action.type === 'ban' && action.id === auditId);
                        if (!ban) throw new RequestError(404, 'ban_not_found');
                        return send(res, 200, { schemaVersion: 1, serverId: config.serverId, observedAt,
                            ban: projectBan(ban, observedAt), changes: (ban.prismaticExpiryChanges ?? []).map(projectChange) });
                    }
                    const bans = db.obj.data.actions.filter(action => action.type === 'ban').map(ban => projectBan(ban, observedAt));
                    return send(res, 200, { schemaVersion: 1, serverId: config.serverId, observedAt, bans });
                }
                const result = changeExpiry(db, config.serverId, operators, id, input, observedAt);
                if (!result.replayed) {
                    const { kind, actorDiscordId, revision } = result.change;
                    console.info(`[pm_moderation] ${id} ${kind} by Discord ${actorDiscordId}, revision ${revision}`);
                }
                return send(res, 200, { schemaVersion: 1, serverId: config.serverId, observedAt, ...result });
            } catch (error) {
                if (error instanceof RequestError) return send(res, error.status, { error: error.message });
                console.error('[pm_moderation] Failed to process request', error.code || error.name);
                return send(res, 503, { error: 'service_unavailable' });
            }
        });
        }
        attachedDatabases.add(db.dbPath);
        for (const { mode, filename } of sockets) {
            const server = listener(mode);
            server.on('error', error => console.error('[pm_moderation] Listener unavailable', mode, error.code || error.name));
            const bind = () => server.listen(filename, () => {
                fs.chmodSync(filename, 0o600);
                console.info(`[pm_moderation] ${mode} socket ready`);
            }).unref();
            const existing = fs.lstatSync(filename, { throwIfNoEntry: false });
            if (!existing) { bind(); continue; }
            if (!existing.isSocket() || existing.uid !== process.getuid()) throw new Error('unsafe moderation socket file');
            const probe = net.createConnection(filename);
            probe.on('connect', () => {
                probe.destroy();
                console.error('[pm_moderation] Listener already active', mode);
            });
            probe.on('error', error => {
                if (error.code !== 'ECONNREFUSED') return console.error('[pm_moderation] Listener unavailable', mode, error.code);
                const current = fs.lstatSync(filename, { throwIfNoEntry: false });
                if (current && (current.ino !== existing.ino || current.dev !== existing.dev)) return;
                if (current) fs.unlinkSync(filename);
                bind();
            });
        }
    } catch (error) {
        console.error('[pm_moderation] Bridge configuration failed', error.code || error.name);
    }
}

module.exports = { attach, writeDatabase, registerNativeBan, revokeNativeBan, changeExpiry, projectBan };
