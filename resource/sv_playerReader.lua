-- This file runs only on the game server. No network events or client exports.
if not TX_SERVER_MODE then return end

local function request(route, params)
    local caller = GetInvokingResource()
    if not caller or (caller ~= 'pm_adminmenu' and not IsPrincipalAceAllowed('resource.' .. caller, 'dci.txadmin.read')) then
        return false, 'forbidden_resource'
    end
    local raw = LoadResourceFile('monitor', '.runtime/player-reader.json')
    local ok, config = pcall(json.decode, raw or '')
    if not ok or type(config) ~= 'table' or config.port ~= 33299 or type(config.token) ~= 'string' or #config.token ~= 64 then
        return false, 'reader_unavailable'
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
    PerformHttpRequest('http://127.0.0.1:33299/v1/' .. route .. '?' .. table.concat(query, '&'), function(status, body, headers, errorData)
        -- On HTTP errors FiveM supplies nil body and puts diagnostics + response JSON
        -- in the fourth callback argument. Never expose the diagnostic text itself.
        if (type(body) ~= 'string' or body == '') and type(errorData) == 'string' then
            body = errorData:match('(%b{})')
        end
        local valid, data = pcall(json.decode, body or '')
        if status ~= 200 or not valid or type(data) ~= 'table' or data.source ~= 'txadmin-memory' then
            local code = valid and type(data) == 'table' and data.error
            if type(code) ~= 'string' or #code > 64 or not code:match('^[a-z_]+$') then
                code = ({ [400] = 'invalid_request', [401] = 'unauthorized', [403] = 'local_only',
                    [404] = 'not_found', [405] = 'read_only', [429] = 'rate_limited',
                    [503] = 'database_unavailable' })[status] or 'reader_unavailable'
            end
            finish({ error = code })
        else
            finish({ data = data })
        end
    end, 'GET', '', { ['Authorization'] = 'Bearer ' .. config.token }, { followLocation = false })
    local result = Citizen.Await(pending)
    -- A leading nil is lost across FiveM's export serialization boundary.
    -- Keep the successful table response unchanged; always send false + code on failure.
    if not result.data then return false, result.error or 'reader_unavailable' end
    return result.data
end

exports('SearchPlayers', function(query, limit, offset)
    if type(query) ~= 'string' or #query > 128 then return false, 'invalid_query' end
    return request('players', { q = query, limit = limit or 25, offset = offset or 0 })
end)

exports('GetPlayerHistory', function(identifier, limit, offset)
    if type(identifier) ~= 'string' or #identifier > 128 then return false, 'invalid_identifier' end
    return request('history', { identifier = identifier, limit = limit or 50, offset = offset or 0 })
end)
