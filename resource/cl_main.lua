-- =============================================
--  ServerCtx Synchronization
-- =============================================
ServerCtx = false

--- Updates ServerCtx based on GlobalState and will send it to NUI
--- NOTE: for now the ServerCtx is only being set when the menu tries to load (enabled or not)
function updateServerCtx()
    stateBagServerCtx = GlobalState.txAdminServerCtx
    if stateBagServerCtx == nil then
        debugPrint('^3ServerCtx fallback support activated.')
        TriggerServerEvent('txsv:req:serverCtx')
    else
        ServerCtx = stateBagServerCtx
        debugPrint('^2ServerCtx updated from global state.')
        sendMenuMessage('setServerCtx', ServerCtx)
    end
end

RegisterNetEvent('txcl:setServerCtx', function(ctx)
    if type(ctx) ~= 'table' then return end
    ServerCtx = ctx
    debugPrint('^2ServerCtx updated from server event.')
    sendMenuMessage('setServerCtx', ServerCtx)
end)



-- =============================================
--  Announcement, DirectMessage and Warn handling
-- =============================================
local function playAnnouncementSound()
    if not IS_FIVEM then return end
    pcall(function()
        PlaySoundFrontend(-1, 'Event_Start_Text', 'GTAO_FM_Events_Soundset', true)
    end)
end

-- Dispatch Announcements
RegisterNetEvent('txcl:showAnnouncement', function(message, author, color, logo)
    playAnnouncementSound()
    sendMenuMessage(
        'addAnnounceMessage',
        {
            message = message,
            author = author,
            color = color,
            logo = logo
        }
    )
end)
local function getAnnouncementLogo(logo)
    if logo == nil or logo == '' then
        return nil
    elseif logo == 'images/diamond-circle-logo.png' then
        return 'nui://monitor/nui/images/diamond-circle-logo.png'
    end
    return logo
end
local function getGtaNotificationPicture(logo)
    if type(logo) ~= 'string' or logo == '' or logo == 'images/diamond-circle-logo.png' then
        return 'CHAR_DEFAULT'
    end
    if logo:find('://', 1, true) or logo:find('/', 1, true) then
        return 'CHAR_DEFAULT'
    end
    return logo
end
local function requestNotificationPicture(textureDict)
    if not IS_FIVEM or type(textureDict) ~= 'string' or textureDict == '' then return end
    if HasStreamedTextureDictLoaded(textureDict) then return end

    RequestStreamedTextureDict(textureDict, false)
    local timeoutAt = GetGameTimer() + 750
    while not HasStreamedTextureDictLoaded(textureDict) and GetGameTimer() < timeoutAt do
        Wait(0)
    end
end
local function tryBulletinAnnouncement(message, author, picture)
    if not IS_FIVEM or GetResourceState('bulletin') ~= 'started' then
        return false
    end

    local ok = pcall(function()
        exports['bulletin']:SendAdvanced({
            message = message or '',
            title = author or 'Server',
            subject = 'Oznameni serveru',
            icon = picture,
            timeout = 5000,
            position = 'bottomright',
            progress = true,
            theme = 'default',
            flash = false,
        })
    end)
    return ok
end
RegisterNetEvent('txcl:showGksphoneAnnouncement', function(message, author, color, logo, phoneType)
    playAnnouncementSound()
    local notifData = {
        title = author or 'Server Announcement',
        message = message or '',
        icon = getAnnouncementLogo(logo),
        duration = 5000,
        type = phoneType or 'success',
        buttonactive = false,
        button = {
            buttonEvent = '',
            buttonData = '',
        }
    }
    local exported = pcall(function()
        exports["gksphone"]:Notification(notifData)
    end)
    if not exported then
        TriggerEvent('txcl:showAnnouncement', message, author, color, logo)
    end
end)
RegisterNetEvent('txcl:showGcphoneAnnouncement', function(message, author, color, logo, phoneType)
    TriggerEvent('txcl:showGksphoneAnnouncement', message, author, color, logo, phoneType)
end)
RegisterNetEvent('txcl:showGtaAnnouncement', function(message, author, color, logo)
    playAnnouncementSound()
    if not IS_FIVEM then
        return TriggerEvent('txcl:showAnnouncement', message, author, color, logo)
    end
    BeginTextCommandThefeedPost('STRING')
    AddTextComponentSubstringPlayerName(('~b~%s~s~\n%s'):format(author or 'Server', message or ''))
    EndTextCommandThefeedPostTicker(false, false)
end)
RegisterNetEvent('txcl:showGtaoAnnouncement', function(message, author, color, logo)
    playAnnouncementSound()
    if not IS_FIVEM then
        return TriggerEvent('txcl:showAnnouncement', message, author, color, logo)
    end

    local picture = getGtaNotificationPicture(logo)
    if tryBulletinAnnouncement(message, author, picture) then
        return
    end

    requestNotificationPicture(picture)
    BeginTextCommandThefeedPost('STRING')
    AddTextComponentSubstringPlayerName(message or '')
    EndTextCommandThefeedPostMessagetext(picture, picture, true, 1, author or 'Server', 'Oznameni serveru')
    EndTextCommandThefeedPostTicker(false, false)
end)
RegisterNetEvent('txcl:showDirectMessage', function(message, author)
    sendMenuMessage(
        'addDirectMessage',
        {
            message = message,
            author = author
        }
    )
end)

-- TODO: remove [SPACE] holding requirement?
local dismissKey, dismissKeyGroup
if IS_FIVEM then
    dismissKey = 22
    dismissKeyGroup = 0
else
    dismissKey = 0xD9D0E1C0
    dismissKeyGroup = 1
end

RegisterNetEvent('txcl:showWarning', function(author, reason, actionId, isWarningNew)
    toggleMenuVisibility(false)
    sendMenuMessage('setWarnOpen', {
        reason = reason,
        warnedBy = author,
        isWarningNew = isWarningNew,
    })
    CreateThread(function()
        local countLimit = 100 --10 seconds
        local count = 0
        while true do
            Wait(100)
            if IsControlPressed(dismissKeyGroup, dismissKey) then
                count = count + 1
                if count >= countLimit then
                    sendMenuMessage('closeWarning')
                    TriggerServerEvent('txsv:ackWarning', actionId)
                    return
                elseif math.fmod(count, 10) == 0 then
                    local secsRemaining = (countLimit - count) / 10
                    sendMenuMessage('pulseWarning', secsRemaining)
                end
            else
                if count > 10 then
                    sendMenuMessage('resetWarning')
                end
                count = 0
            end
        end
    end)
end)

--- Awaits the player to start walking before issuing the warning
--- to prevent players from being warned during character selection.
--- Unlike the warn dismissal, stopping does not reset the counter.
--- NOTE: Doing walk detection this way because IsPedRunning isn't reliable,
--- and IsPedStopped is true even while teleporting.
CreateThread(function()
    local minimumMoveCycles = 20 -- around 5 seconds of walking
    local moveCycles = 0
    local hasPedStartedWalking = false
    while true do
        Wait(250)
        local ped = PlayerPedId()
        if type(ped) == 'number' and ped > 0 then
            if hasPedStartedWalking then
                if not IsPedStopped(ped) then
                    moveCycles = moveCycles + 1
                    if moveCycles >= minimumMoveCycles then
                        TriggerServerEvent('txsv:startedWalking')
                        debugPrint('Player started walking.')
                        return
                    end
                end
            elseif IsPedWalking(ped) or IsPedRunning(ped) then
                hasPedStartedWalking = true
            end
        end
    end
end)

-- =============================================
--  Other stuff
-- =============================================
-- Removing unwanted chat suggestions
-- We only want suggestion for: /tx, /txAdmin-reauth
-- The suggestion is added after 500ms, so we need to wait more
CreateThread(function()
    Wait(1000)
    local suggestionsToRemove = {
        --Commands
        '/txadmin',
        '/txaPing',
        '/txaEvent',
        '/txaReportResources',
        '/txaSetDebugMode',
        '/txaInitialData',

        --Keybinds
        '/txAdmin:menu:openPlayersPage',
        '/txAdmin:menu:clearArea',
        '/txAdmin:menu:healMyself',
        '/txAdmin:menu:tpBack',
        '/txAdmin:menu:tpToCoords',
        '/txAdmin:menu:tpToWaypoint',
        '/txAdmin:menu:noClipToggle',
        '/txAdmin:menu:togglePlayerIDs',
        '/txAdmin:menu:boostVehicle',
        '/txAdmin:menu:deleteVehicle',
        '/txAdmin:menu:fixVehicle',
        '/txAdmin:menu:spawnVehicle',

        --Convars
        '/txAdmin-version',
        '/txAdmin-locale',
        '/txAdmin-localeFile',
        '/txAdmin-verbose',
        '/txAdmin-luaComHost',
        '/txAdmin-luaComToken',
        '/txAdmin-checkPlayerJoin',
        '/txAdmin-pipeToken',
        '/txAdmin-debugMode',
        '/txAdmin-hideDefaultAnnouncement',
        '/txAdmin-hideDefaultDirectMessage',
        '/txAdmin-hideDefaultWarning',
        '/txAdmin-hideDefaultScheduledRestartWarning',
        '/txAdmin-hideAdminInPunishments',
        '/txAdmin-hideAdminInMessages',
        '/txAdmin-serverName',
        '/txAdminServerMode',

        --Menu convars
        '/txAdmin-menuEnabled',
        '/txAdmin-menuAlignRight',
        '/txAdmin-menuPageKey',
        '/txAdmin-menuPlayerIdDistance',
        '/txAdmin-menuDrunkDuration'
    }

    for _, suggestion in ipairs(suggestionsToRemove) do
        TriggerEvent('chat:removeSuggestion', suggestion)
    end
end)


-- =============================================
--  Helper to protect the NUI callbacks from CSRF attacks
--  NOTE: This is a temporary fix for the NUI callback Origin issue
-- =============================================
--- Check if a NUI callback is from the correct Origin
--- technically no request should come from nui://monitor, since the manifest version is cerulean
---@param headers table
---@return boolean
function IsNuiRequestOriginValid(headers)
    if type(headers) ~= 'table' then
        return false --no clue
    end
    if headers['Origin'] == nil then
        return true --probably legacy page
    end
    if type(headers['Origin']) ~= 'string' or headers['Origin'] == '' then
        return false --no clue
    end

    if headers['Origin'] == 'https://cfx-nui-monitor' then
        return true --probably self
    end
    if headers['Origin'] == 'https://monitor' then
        return true --probably legacy iframe inside web iframe
    end

    -- warn admin of possible csrf attempt
    if menuIsAccessible and sendPersistentAlert then
        local msg = ('ATTENTION! txAdmin received a NUI message from the origin "%s" which is not approved. This likely means that that resource is vulnerable to XSS which has been exploited to inject txAdmin commands. It is recommended that you fix the vulnerability or remove that resource completely. For more information: discord.gg/txAdmin.'):format(headers['Origin'])
        sendPersistentAlert('csrfWarning', 'error', msg, false)
    end

    return false
end

--- Wrapper for RegisterRawNuiCallback which mimics the behavior of RegisterNUICallback
--- but checks the origin of the request to prevent CSRF attacks
function RegisterSecureNuiCallback(callbackName, funcCallback)
    RegisterRawNuiCallback(callbackName, function(req, nuiCallback)
        if not IsNuiRequestOriginValid(req.headers) then
            debugPrint(("^1Invalid NUI callback origin for %s"):format(callbackName))
            return nuiCallback({
                status = 403,
                body = '{}',
            })
        end

        -- calls the function
        funcCallback(json.decode(req.body), function(data)
            nuiCallback({
                status = 200,
                body = type(data) == 'table' and json.encode(data) or '{}',
            })
        end)
    end)
end
