'use strict';

// Read the live LowDB object on every request. Never write player/action data.
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const PORT = 33299;
const identifierPattern = /^(license2?|steam|discord|fivem|xbl|live):[a-z0-9]+$/i;
const publicIds = ids => (ids || []).filter(id => typeof id === 'string' && identifierPattern.test(id));
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const playerIds = player => [...new Set([`license:${player.license}`, ...publicIds(player.ids)])];

class RequestError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}

function page(params) {
    const number = (key, fallback, max) => {
        const text = params.get(key);
        if (text === null) return fallback;
        if (!/^\d{1,7}$/.test(text) || Number(text) > max) throw new RequestError(400, 'invalid_pagination');
        return Number(text);
    };
    return { limit: Math.max(1, number('limit', 25, 100)), offset: number('offset', 0, 1000000) };
}

function projectPlayer(player) {
    return {
        license: `license:${player.license}`, name: player.displayName,
        identifiers: playerIds(player), playTime: player.playTime,
        joinedAt: player.tsJoined, lastConnectionAt: player.tsLastConnection,
        whitelistedAt: player.tsWhitelisted || null,
    };
}

function projectAction(action, now) {
    const revoked = action.revocation?.timestamp != null;
    const status = revoked ? 'revoked' : action.type === 'ban'
        ? (action.expiration === false || action.expiration > now ? 'active' : 'expired')
        : (action.acked ? 'acknowledged' : 'pending');
    return {
        id: action.id, type: action.type, reason: action.reason, author: action.author,
        playerName: action.playerName, timestamp: action.timestamp,
        expiration: action.expiration, status,
        revocation: revoked ? { timestamp: action.revocation.timestamp, author: action.revocation.author } : null,
        ...(action.type === 'warn' ? { acknowledged: action.acked === true } : {}),
    };
}

function search(data, params) {
    const query = (params.get('q') || '').trim();
    if (query.length > 128 || (query.length > 0 && query.length < 3)) throw new RequestError(400, 'invalid_query');
    const q = normalize(query);
    const exact = identifierPattern.test(q);
    const numeric = /^\d+$/.test(q);
    const hash = /^[a-f0-9]{40}$/.test(q);
    const result = data.players.filter(player => {
        if (!q) return true;
        const ids = playerIds(player).map(id => id.toLowerCase());
        if (exact) return ids.includes(q);
        if (numeric) return ids.some(id => id.slice(id.indexOf(':') + 1) === q);
        if (hash) return player.license.toLowerCase() === q;
        return normalize(player.displayName).includes(q) || normalize(player.pureName).includes(q);
    });
    const { limit, offset } = page(params);
    return { players: result.slice(offset, offset + limit).map(projectPlayer), total: result.length, limit, offset };
}

function history(data, params, now, requiredHwidMatches) {
    const identifier = (params.get('identifier') || '').toLowerCase();
    if (!identifierPattern.test(identifier) || identifier.length > 128) throw new RequestError(400, 'invalid_identifier');
    // Canonical license avoids unintentionally combining two players sharing a Discord account.
    const player = identifier.startsWith('license:') ? data.players.find(p => `license:${p.license}`.toLowerCase() === identifier) : null;
    const ids = new Set(player ? playerIds(player).map(id => id.toLowerCase()) : [identifier]);
    const hwids = new Set(player?.hwids || []);
    const actions = data.actions.filter(action => ['ban', 'warn'].includes(action.type) && (
        (action.ids || []).some(id => ids.has(id.toLowerCase())) ||
        (requiredHwidMatches > 0 && (action.hwids || []).filter(id => hwids.has(id)).length >= requiredHwidMatches)
    )).sort((a, b) => b.timestamp - a.timestamp || a.id.localeCompare(b.id));
    const { limit, offset } = page(params);
    return { player: player ? projectPlayer(player) : null,
        actions: actions.slice(offset, offset + limit).map(action => projectAction(action, now)), total: actions.length, limit, offset };
}

function createServer(db, token, requiredHwidMatches = () => 0) {
    let requests = 0, windowAt = Date.now();
    const digest = crypto.createHash('sha256').update(token).digest();
    return http.createServer({ maxHeaderSize: 4096, headersTimeout: 5000, requestTimeout: 5000 }, (req, res) => {
        const send = (status, body) => {
            res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
                'X-Content-Type-Options': 'nosniff', 'Connection': 'close' });
            res.end(JSON.stringify(body));
        };
        try {
            if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return send(403, { error: 'local_only' });
            const auth = req.headers.authorization || '';
            if (auth.length > 256 || !crypto.timingSafeEqual(digest, crypto.createHash('sha256').update(auth.replace(/^Bearer /, '')).digest()) || !auth.startsWith('Bearer ')) {
                return send(401, { error: 'unauthorized' });
            }
            if (req.method !== 'GET') return send(405, { error: 'read_only' });
            if (Date.now() - windowAt >= 1000) { requests = 0; windowAt = Date.now(); }
            if (++requests > 20) return send(429, { error: 'rate_limited' });
            if (!db.isReady || !db.obj?.data) return send(503, { error: 'database_unavailable' });
            const url = new URL(req.url, 'http://127.0.0.1');
            if (req.url.length > 2048) return send(400, { error: 'invalid_query' });
            const observedAt = Math.floor(Date.now() / 1000);
            const data = db.obj.data;
            const result = url.pathname === '/v1/players' ? search(data, url.searchParams)
                : url.pathname === '/v1/history' ? history(data, url.searchParams, observedAt, requiredHwidMatches())
                : url.pathname === '/v1/status' ? { ready: true } : null;
            if (!result) return send(404, { error: 'not_found' });
            send(200, { schemaVersion: 1, source: 'txadmin-memory', observedAt, ...result });
        } catch (error) {
            send(error instanceof RequestError ? error.status : 503,
                { error: error instanceof RequestError ? error.message : 'service_unavailable' });
        }
    });
}

function attach(db, resourcePath, requiredHwidMatches) {
    try {
        const directory = path.join(resourcePath, '.runtime');
        fs.mkdirSync(directory, { recursive: true });
        const token = crypto.randomBytes(32).toString('hex');
        const filename = path.join(directory, 'player-reader.json');
        const temp = `${filename}.${crypto.randomUUID()}.tmp`;
        // This private file is outside all client-visible manifest globs.
        fs.writeFileSync(temp, JSON.stringify({ port: PORT, token }), { flag: 'wx', mode: 0o600 });
        fs.renameSync(temp, filename);
        const server = createServer(db, token, requiredHwidMatches);
        server.on('error', error => console.error('[dci_player_reader] Listener unavailable:', error.code || error.name));
        server.listen(PORT, '127.0.0.1', () => console.info(`[dci_player_reader] Read-only live database ready on loopback:${PORT}`)).unref();
        return server;
    } catch (error) {
        console.error('[dci_player_reader] Setup failed:', error.code || error.name);
    }
}

module.exports = { attach, createServer, search, history, projectAction };
