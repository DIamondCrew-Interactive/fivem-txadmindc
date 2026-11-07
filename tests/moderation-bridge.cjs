'use strict';

const { strict: assert } = require('node:assert');
const { test } = require('node:test');
const { changeExpiry, projectBan } = require('../core/modules/Moderation/bridge.cjs');

test('expiry changes preserve the original author and keep a durable moderator audit', () => {
    const now = 1800000000;
    const actor = '123456789012345678';
    const ban = {
        id: 'TEST-BAN1', type: 'ban', ids: [], author: 'Original admin', timestamp: now - 1,
        reason: 'Original reason', expiration: now + 500, revocation: { timestamp: null, author: null },
    };
    const db = { obj: { data: { actions: [ban] } } };
    const input = {
        serverId: 'dc-rp-dev', requestId: 'test-00000001', actorDiscordId: actor,
        expectedRevision: 0, expectedExpiresAt: now + 500, expiresAt: now + 100, reason: 'Appeal accepted',
    };
    const operators = new Set([actor]);
    assert.throws(() => changeExpiry(db, input.serverId, operators, ban.id, input, now, () => { throw Error('disk full'); }), /disk full/);
    assert.equal(ban.expiration, now + 500);
    assert.equal(ban.prismaticExpiryChanges, undefined);
    let persisted;
    const write = (_, content) => { persisted = JSON.parse(content); return true; };
    const result = changeExpiry(db, input.serverId, operators, ban.id, input, now, write);
    assert.equal(result.change.kind, 'shortened');
    assert.equal(result.ban.issuedBy, 'Original admin');
    assert.equal(persisted.actions[0].prismaticExpiryChanges[0].actorDiscordId, actor);
    assert.equal(persisted.actions[0].expiration, now + 100);
    const recovered = { obj: { data: persisted } };
    const retry = changeExpiry(recovered, input.serverId, operators, ban.id, input, now + 5, write);
    assert.equal(retry.replayed, true);
    assert.equal(retry.ban.revision, 1);
    ban.revocation = { author: 'Revoke admin', timestamp: now + 10 };
    assert.equal(projectBan(ban, now + 10).revokedBy, 'Revoke admin');
});
