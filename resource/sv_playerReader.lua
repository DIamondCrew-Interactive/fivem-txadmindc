-- This file runs only on the game server. No network events or client exports.
if not TX_SERVER_MODE then return end

local function request(route, params)
    local caller = GetInvokingResource()
    if not caller or (caller ~= 'pm_adminmenu' and not IsPrincipalAceAllowed('resource.' .. caller, 'dci.txadmin.read')) then
        return nil, 'forbidden_resource'
    end
    local raw = LoadResourceFile('monitor', '.runtime/player-reader.json')
    local ok, config = pcall(json.decode, raw or '')
    if not ok or type(config) ~= 'table' or config.port ~= 33299 or type(config.token) ~= 'string' or #config.token ~= 64 then
        return nil, 'reader_unavailable'
    end
    local function encode(value)
        return tostring(value):gsub('([^%w%-_%.~])', function(c) return ('%%%02X'):format(c:byte()) end)
    end
    local query = {}
    for key, value in pairs(params) do if value ~= nil then query[#query + 1] = key .. '=' .. encode(value) end end
    local pending = promise.new()
    local finished = false
    local function finish(value)
        if finished then return end
        finished = true
        pending:resolve(value)
    end
    SetTimeout(4000, function() finish({ error = 'reader_timeout' }) end)
    PerformHttpRequest('http://127.0.0.1:33299/v1/' .. route .. '?' .. table.concat(query, '&'), function(status, body)
        local valid, data = pcall(json.decode, body or '')
        if status ~= 200 or not valid or type(data) ~= 'table' or data.source ~= 'txadmin-memory' then
            finish({ error = valid and type(data) == 'table' and data.error or 'reader_unavailable' })
        else
            finish({ data = data })
        end
    end, 'GET', '', { ['Authorization'] = 'Bearer ' .. config.token }, { followLocation = false })
    local result = Citizen.Await(pending)
    return result.data, result.error
end

exports('SearchPlayers', function(query, limit, offset)
    if type(query) ~= 'string' or #query > 128 then return nil, 'invalid_query' end
    return request('players', { q = query, limit = limit or 25, offset = offset or 0 })
end)

exports('GetPlayerHistory', function(identifier, limit, offset)
    if type(identifier) ~= 'string' or #identifier > 128 then return nil, 'invalid_identifier' end
    return request('history', { identifier = identifier, limit = limit or 50, offset = offset or 0 })
end)
