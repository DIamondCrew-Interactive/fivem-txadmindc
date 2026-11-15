local source = assert(io.open('resource/sv_playerReader.lua', 'r')):read('*a')
local function fixture(caller, allowed, mode)
    local registered, sent, timer = {}, nil, nil
    local env = {
        TX_SERVER_MODE = true,
        GetInvokingResource = function() return caller end,
        IsPrincipalAceAllowed = function(principal, permission)
            assert(principal == 'resource.' .. caller and permission == 'dci.txadmin.read')
            return allowed
        end,
        LoadResourceFile = function(resource, file)
            assert(resource == 'monitor' and file == '.runtime/player-reader.json')
            return mode == 'missing' and '' or 'config'
        end,
        json = { decode = function(text)
            local code = text:match('^{"error":"([a-z_]+)"}$')
            if code then return { error = code } end
            if text == 'config' then return { port = 33299, token = string.rep('t', 64) } end
            if text == 'response' then return { source = 'txadmin-memory', players = {}, observedAt = 123 } end
            if text == 'wrong-source' then return { source = 'disk-copy', players = {} } end
            if text == 'rate-limited' then return { error = 'rate_limited' } end
            if text == 'invalid-query' then return { error = 'invalid_query' } end
            if text == 'invalid-pagination' then return { error = 'invalid_pagination' } end
            if text == 'invalid-identifier' then return { error = 'invalid_identifier' } end
            if text == 'database-unavailable' then return { error = 'database_unavailable' } end
            error('invalid JSON')
        end },
        exports = function(name, fn) registered[name] = fn end,
        promise = { new = function() return { resolve = function(self, value) self.value = value end } end },
        SetTimeout = function(ms, fn) assert(ms == 4000); timer = fn end,
        PerformHttpRequest = function(url, callback, method, body, headers, options)
            assert(method == 'GET' and body == '' and options.followLocation == false)
            assert(headers.Authorization == 'Bearer ' .. string.rep('t', 64))
            assert(url:match('^http://127%.0%.0%.1:33299/v1/'))
            sent = url
            if mode ~= 'timeout' then
                if mode == 'body-error' then callback(400, 'invalid-query'); return end
                if mode == 'status-only' then callback(429, nil, {}, 'HTTP 429'); return end
                local errors = { ['rate-limited'] = 429, ['invalid-query'] = 400, ['invalid-pagination'] = 400,
                    ['invalid-identifier'] = 400, ['database-unavailable'] = 503 }
                if errors[mode] then
                    callback(errors[mode], nil, {}, 'HTTP request failed\n{"error":"' .. mode:gsub('-','_') .. '"}')
                else
                    callback(mode == 'unauthorized' and 401 or 200, mode == 'wrong-source' and 'wrong-source' or 'response')
                end
            end
        end,
    }
    env.Citizen = { Await = function(p) if not p.value then timer() end; return p.value end }
    setmetatable(env, { __index = _G })
    assert(load(source, 'sv_playerReader.lua', 't', env))()
    return registered, function() return sent end
end

for _, caller in ipairs({ 'untrusted_resource', false }) do
    local api, sent = fixture(caller or nil, false)
    local result, err = api.SearchPlayers('fivem:904336')
    assert(result == false and err == 'forbidden_resource' and sent() == nil)
end
for _, caller in ipairs({ 'pm_adminmenu', 'trusted_other_menu' }) do
    local api, sent = fixture(caller, true)
    local result, err = api.SearchPlayers('fivem:904336')
    assert(result.source == 'txadmin-memory' and err == nil)
    assert(sent():find('q=fivem%%3A904336'))
    result, err = api.GetPlayerHistory('license:' .. string.rep('a', 40), 50, 0)
    assert(result.source == 'txadmin-memory' and err == nil)
    result, err = api.SearchPlayers({})
    assert(result == false and err == 'invalid_query')
    result, err = api.GetPlayerHistory(nil)
    assert(result == false and err == 'invalid_identifier')
end
for _, mode in ipairs({ 'missing', 'timeout', 'unauthorized', 'wrong-source' }) do
    local api = fixture('pm_adminmenu', false, mode)
    local result, err = api.SearchPlayers('fivem:904336')
    assert(result == false and type(err) == 'string')
end
for mode, code in pairs({ ['rate-limited'] = 'rate_limited', ['invalid-query'] = 'invalid_query',
    ['invalid-pagination'] = 'invalid_pagination', ['invalid-identifier'] = 'invalid_identifier',
    ['database-unavailable'] = 'database_unavailable', ['body-error'] = 'invalid_query', ['status-only'] = 'rate_limited' }) do
    local api = fixture('pm_adminmenu', false, mode)
    local result, err = api.SearchPlayers('fivem:904336')
    assert(result == false and err == code)
    -- Model a serialized result array: false retains the second element; nil does not.
    local transported = { result, err }
    assert(#transported == 2 and transported[1] == false and transported[2] == code)
end
print('Player reader Lua: server-only grants, input, HTTP contract, timeout and failure paths OK')
