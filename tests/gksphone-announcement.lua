local source = assert(io.open('resource/cl_main.lua', 'r')):read('*a')
local first = assert(source:find('local function getGksphoneAnnouncementIcon', 1, true))
local last = assert(source:find("RegisterNetEvent('txcl:showGtaAnnouncement'", first, true))
local cases = {
    {name='missing logo', icon='/html/img/icons/messages.png'},
    {name='empty logo', logo='', icon='/html/img/icons/messages.png'},
    {name='invalid icon', logo='CHAR_DEFAULT', icon='/html/img/icons/messages.png'},
    {name='default brand', logo='images/diamond-circle-logo.png', icon='https://cfx-nui-monitor/nui/images/diamond-circle-logo.png'},
    {name='legacy NUI', logo='nui://monitor/nui/images/diamond-circle-logo.png', icon='https://cfx-nui-monitor/nui/images/diamond-circle-logo.png'},
    {name='phone icon', logo='/html/img/icons/messages.png', icon='/html/img/icons/messages.png'},
    {name='stopped resource', state='stopped', fallback=true},
    {name='export throws', throws=true, fallback=true},
    {name='export rejects', result=false, fallback=true},
    {name='export returns true', result=true, icon='/html/img/icons/messages.png'},
}
for _, case in ipairs(cases) do
    local events, fallback, calls, payload = {}, 0, 0, nil
    local env = setmetatable({
        RegisterNetEvent=function(name, fn) events[name]=fn end,
        GetResourceState=function(name) assert(name=='gksphone'); return case.state or 'started' end,
        TriggerEvent=function(name, message, author)
            assert(name=='txcl:showAnnouncement'); assert(message=='Zkouška žluťoučký'); assert(author=='Správa'); fallback=fallback+1
        end,
        exports={gksphone={Notification=function(_, data)
            calls=calls+1; payload=data
            if case.throws then error('simulated export failure') end
            return case.result
        end}},
        playAnnouncementSound=function() error('GKS handler must not play an unconditional success sound') end,
        print=function() end,
    }, {__index=_G})
    assert(load(source:sub(first,last-1), 'gksphone-handler', 't', env))()
    events['txcl:showGksphoneAnnouncement']('Zkouška žluťoučký','Správa',nil,case.logo,'success')
    assert(fallback==(case.fallback and 1 or 0), case.name..': fallback')
    assert(calls==(case.state=='stopped' and 0 or 1), case.name..': export calls')
    if case.icon then
        assert(payload.icon==case.icon, case.name..': icon')
        assert(payload.message=='Zkouška žluťoučký' and payload.title=='Správa' and payload.duration==5000)
    end
    print('PASS '..case.name)
end
