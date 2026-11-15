const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../core/modules/PlayerReader/bridge.cjs');

const license = 'a'.repeat(40);
const other = 'b'.repeat(40);
const fixture = () => ({ isReady: true, obj: { data: {
    players: [{ license, displayName: 'Žluťoučký hráč', pureName: 'zlutoucky hrac',
        ids: [`license:${license}`, 'discord:123456789012345678', 'fivem:904336', 'ip:192.0.2.1'],
        hwids: ['private-1', 'private-2'], mugshot: 'private-image', playTime: 12, tsJoined: 1, tsLastConnection: 2 },
        { license: other, displayName: 'Druhý', ids: ['fivem:22'], hwids: [] }],
    actions: [
        { id: 'A001-0001', type: 'ban', ids: ['fivem:904336'], reason: 'Test', author: 'admin', timestamp: 5, expiration: false, revocation: { timestamp: null, author: null } },
        { id: 'A001-0002', type: 'ban', ids: [`license:${license}`], reason: 'Expired', timestamp: 4, expiration: 1 },
        { id: 'A001-0003', type: 'warn', ids: [`license:${license}`], reason: 'Pending', timestamp: 3, expiration: false, acked: false },
        { id: 'A001-0004', type: 'warn', ids: [`license:${license}`], reason: 'Revoked', timestamp: 2, expiration: false, acked: true, revocation: { timestamp: 6, author: 'admin' } },
        { id: 'A001-0005', type: 'ban', ids: ['license:' + other], hwids: ['private-1', 'private-2'], reason: 'Hardware', timestamp: 1, expiration: false },
    ],
} } });

async function setup(t, requiredHwidMatches = () => 2) {
    const db = fixture();
    const server = createServer(db, 'test-only-token', requiredHwidMatches);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const url = `http://127.0.0.1:${server.address().port}`;
    const request = async (route, options = {}) => {
        const response = await fetch(url + route, { headers: { Authorization: 'Bearer test-only-token' }, ...options });
        return { status: response.status, data: await response.json(), headers: response.headers };
    };
    return { db, server, request };
}

test('authentication, cross-server key and methods fail closed', async t => {
    const { request } = await setup(t);
    assert.equal((await request('/v1/players', { headers: {} })).status, 401);
    assert.equal((await request('/v1/players', { headers: { Authorization: 'Bearer another-server' } })).status, 401);
    assert.equal((await request('/v1/players', { method: 'POST', body: '{}' })).status, 405);
    assert.equal((await request('/v1/players', { method: 'DELETE' })).status, 405);
});

test('search exact identifiers and names, without leaking IP/hardware/mugshots', async t => {
    const { request } = await setup(t);
    for (const q of ['fivem:904336', 'discord:123456789012345678', '904336', 'zlutoucky', license]) {
        const response = await request('/v1/players?q=' + encodeURIComponent(q));
        assert.equal(response.status, 200);
        assert.equal(response.data.total, 1);
        assert.equal(response.data.players[0].license, 'license:' + license);
        assert.doesNotMatch(JSON.stringify(response.data), /192\.0\.2|private|mugshot|hwids/);
    }
    assert.equal((await request('/v1/players?q=fivem:904')).data.total, 0);
});

test('live unsaved changes and replaced database object appear immediately without DB writes', async t => {
    const { db, request } = await setup(t);
    const before = JSON.stringify(db);
    await request('/v1/players?q=904336');
    await request('/v1/history?identifier=license:' + license);
    assert.equal(JSON.stringify(db), before);
    db.obj.data.players[0].displayName = 'Nové jméno';
    assert.equal((await request('/v1/players?q=nove')).data.total, 1);
    db.obj = { data: { players: [], actions: [] } };
    assert.equal((await request('/v1/players')).data.total, 0);
});

test('history matches identifiers and configured HWID threshold, preserves revocations', async t => {
    const { request } = await setup(t);
    const { data } = await request('/v1/history?identifier=license:' + license);
    assert.deepEqual(data.actions.map(a => a.status), ['active', 'expired', 'pending', 'revoked', 'active']);
    assert.equal(data.actions[3].revocation.author, 'admin');
    assert.doesNotMatch(JSON.stringify(data), /private/);
    const direct = await request('/v1/history?identifier=fivem:904336');
    assert.equal(direct.data.player, null);
    assert.equal(direct.data.total, 1);
});

test('HWID matching disabled follows txAdmin configuration', async t => {
    const { request } = await setup(t, () => 0);
    assert.equal((await request('/v1/history?identifier=license:' + license)).data.total, 4);
});

test('pagination, unknown routes, invalid input and readiness', async t => {
    const { db, request } = await setup(t);
    const response = await request('/v1/players?limit=1&offset=1');
    assert.equal(response.data.players[0].license, 'license:' + other);
    assert.equal(response.data.total, 2);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    for (const route of ['/v1/players?limit=101', '/v1/players?offset=-1', '/v1/players?q=ab', '/v1/history?identifier=../../admins.json']) {
        assert.equal((await request(route)).status, 400);
    }
    assert.equal((await request('/v1/admins')).status, 404);
    db.isReady = false;
    assert.equal((await request('/v1/status')).status, 503);
});

test('authenticated callers are rate limited', async t => {
    const { request } = await setup(t);
    for (let i = 0; i < 20; i++) assert.equal((await request('/v1/status')).status, 200);
    assert.equal((await request('/v1/status')).status, 429);
});
