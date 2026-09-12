# DiamondCrew txAdmin Pterodactyl Installer Brief

This document is a handoff brief for an AI agent building an automatic FiveM server installer for Pterodactyl that ships with the DiamondCrew-customized txAdmin.

## Goal

Build an installer that can create or provision a Pterodactyl server running FiveM/FXServer with this customized txAdmin build. The installer should be repeatable, non-interactive where possible, and safe to run on a fresh Pterodactyl node.

The target output is a working Pterodactyl server with:

- FXServer installed.
- The customized `monitor`/txAdmin resource deployed.
- txAdmin panel available.
- Server data folder created.
- `server.cfg` generated from user-provided inputs.
- Optional txAdmin recipe execution.
- Optional database provisioning.
- Clear logs and rollback behavior.

## Repository Layout

Relevant folders in this txAdmin tree:

- `core/`: Node backend for txAdmin.
- `panel/`: React/Vite webpanel.
- `nui/`: React/Vite in-game menu.
- `resource/`: FiveM/RedM resource files that run as `monitor`.
- `shared/`: shared TypeScript types.
- `locale/`: txAdmin locale files, including `cs.json`.
- `docs/`: documentation.
- `dist/`: build output after running panel/NUI/core builds.

DiamondCrew customization currently includes:

- PNG logo assets:
  - `panel/public/images/diamond-circle-logo.png`
  - `nui/public/images/diamond-circle-logo.png`
  - `panel/public/images/diamond-logo.png`
  - `nui/public/images/diamond-logo.png`
- Branded webpanel/NUI identity: `DiamondCrew Interactive`.
- Webpanel demo mode via `?demo=1`.
- gksphone announcement delivery.
- GTA-style announcement delivery.
- Mugshot cache pipeline for playerlist avatars.
- Small webpanel language toggle for custom Czech/English strings.

## Build Requirements

Build on Windows if using the upstream txAdmin release builder. For development-only panel/NUI validation, Node can run on other platforms, but the official txAdmin builder expects Windows.

Required:

- Node.js 22.9 or newer.
- npm.
- FXServer artifact for the target platform.
- Pterodactyl Panel application API key.
- Pterodactyl Wings node with an allocation available.
- A Pterodactyl FiveM egg, or a custom egg created for this installer.

Useful commands:

```sh
npm install
npm run build -w panel
npm run build -w nui
npm run typecheck -w core
```

The root `npm run build` invokes the release publish script for `core`; do not call it blindly unless the release builder arguments/environment are configured.

## Pterodactyl Architecture

Use the Pterodactyl Application API for administrative provisioning:

- Create server.
- Assign allocation.
- Set egg, startup command, Docker image, limits, environment variables.
- Optionally create database.

Use the Pterodactyl Client API or SFTP for per-server file operations after creation:

- Upload FXServer artifacts.
- Upload customized txAdmin `monitor` resource.
- Write `server.cfg`.
- Write txAdmin profile/config files.
- Start, stop, restart, and send console commands.

Do not hardcode Panel URLs, node IDs, egg IDs, nests, allocations, API tokens, license keys, or database passwords. Treat them as installer inputs or environment variables.

## Recommended Installer Inputs

Required inputs:

- `PTERO_PANEL_URL`
- `PTERO_APPLICATION_API_KEY`
- `PTERO_CLIENT_API_KEY`
- `PTERO_NODE_ID`
- `PTERO_NEST_ID`
- `PTERO_EGG_ID`
- `PTERO_ALLOCATION_ID`
- `SERVER_NAME`
- `SERVER_OWNER_USER_ID`
- `FIVEM_LICENSE_KEY`
- `TXADMIN_ADMIN_USERNAME`
- `TXADMIN_ADMIN_PASSWORD` or generated temporary secret

Optional inputs:

- `SERVER_MEMORY_MB`
- `SERVER_DISK_MB`
- `SERVER_CPU_LIMIT`
- `SERVER_MAX_PLAYERS`
- `FXSERVER_ARTIFACT_URL`
- `RECIPE_URL`
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `GKSPHONE_ENABLED`

## Startup Strategy

The Pterodactyl server should start FXServer in a way that txAdmin can manage the server:

```sh
./FXServer +set txAdminPort {{TXADMIN_PORT}} +set txAdminInterface 0.0.0.0 +set txDataPath ./txData
```

When Pterodactyl exposes only one primary allocation, decide whether the webpanel port is exposed through:

- a second allocation for txAdmin,
- a reverse proxy,
- or a fixed internal port mapped by the host.

Do not assume port `40120` is reachable unless the allocation/proxy is configured.

## File Deployment

Expected server layout inside the Pterodactyl container:

```text
/home/container/
  FXServer
  alpine/
  txData/
  server-data/
    server.cfg
    resources/
  citizen/system_resources/monitor/
    entrypoint.js
    fxmanifest.lua
    resource/
    panel/
    nui/
    web/
    docs/
```

The exact artifact layout can vary by FXServer build. The installer must detect where `citizen/system_resources/monitor` exists after extracting FXServer and replace or patch that monitor resource with the customized txAdmin build.

Minimum files to deploy for this customized txAdmin:

- `entrypoint.js`
- `fxmanifest.lua`
- `resource/**/*`
- `dist/panel/**/*` copied to runtime `panel/**/*`
- `dist/nui/**/*` copied to runtime `nui/**/*`
- `web/public/**/*`
- `docs/**/*`
- required generated metadata from the txAdmin build process if present

## Configuration

Generate `server.cfg` with at least:

```cfg
sv_licenseKey "{{FIVEM_LICENSE_KEY}}"
sv_hostname "{{SERVER_NAME}}"
sets sv_projectName "{{SERVER_NAME}}"
sets sv_projectDesc "DiamondCrew Interactive"
sv_maxclients {{SERVER_MAX_PLAYERS}}
endpoint_add_tcp "0.0.0.0:30120"
endpoint_add_udp "0.0.0.0:30120"

ensure mapmanager
ensure chat
ensure spawnmanager
ensure sessionmanager
ensure hardcap
ensure monitor
```

For Czech in-game txAdmin language:

```cfg
setr locale "cs"
```

For English:

```cfg
setr locale "en"
```

The webpanel custom Czech/English toggle stores its preference in browser localStorage under:

```text
txa:panel:language
```

## txAdmin Recipe Support

If the installer supports txAdmin recipes:

- Download the YAML recipe from a trusted URL.
- Validate that it is YAML and does not contain unexpected absolute paths.
- Let txAdmin's deployer run the recipe if possible.
- Otherwise implement a compatible subset:
  - `download_github`
  - `download_file`
  - `unzip`
  - `move_path`
  - `copy_path`
  - `remove_path`
  - `ensure_dir`
  - `write_file`
  - `replace_string`
  - `connect_database`
  - `query_database`
  - `load_vars`

Keep all recipe file writes jailed inside the target server-data folder.

## gksphone Integration

The customized txAdmin announcement flow supports a `gksphone` mode.

Client-side event:

```lua
RegisterNetEvent('txcl:showGksphoneAnnouncement', function(message, author, color, logo, phoneType)
    local notifData = {
        title = author or 'Server Announcement',
        message = message or '',
        icon = '/html/img/icons/messages.png',
        duration = 5000,
        type = phoneType or 'success',
        buttonactive = false,
        button = {
            buttonEvent = '',
            buttonData = '',
        }
    }
    exports["gksphone"]:Notification(notifData)
end)
```

Installer behavior:

- If `GKSPHONE_ENABLED=true`, ensure `gksphone` is installed and starts before resources that depend on it.
- If not installed, txAdmin falls back to the normal announcement UI.
- Always provide a PNG icon: GKSPhone derives its lock-screen app name from the icon filename. A nil icon can throw in the phone NUI even when the Lua export returns successfully.
- The default icon matches the working pm_bells integration: `/html/img/icons/messages.png`. The runtime normalizes a selected DiamondCrew logo to `https://cfx-nui-monitor/nui/images/diamond-circle-logo.png`.
- The runtime checks that gksphone is started and falls back on a synchronous export exception or an explicit false return. Export success alone does not confirm rendering on a player's phone.

## Mugshot Cache Design

The customized playerlist supports optional `mugshot` data.

Expected behavior:

- First mugshot request is scheduled about 2 minutes after a player joins.
- Refresh is scheduled about once per hour after that.
- Each player has random jitter so refreshes do not happen at the same time.
- Captured image is stored in txAdmin player DB under the player license.
- Webpanel receives a lightweight `playerUpdated` socket event instead of a full playerlist refresh.

Important limitation:

- FiveM headshot textures are only available inside the game/NUI runtime.
- The external webpanel cannot load a raw `nui-img://` texture.
- The NUI must convert the texture to a regular PNG data URL or the server must receive a normal URL/base64 payload.

## Security Rules

Never log secrets:

- Pterodactyl API keys.
- FiveM license key.
- txAdmin admin password.
- Database password.
- Discord bot token.

Validate all user inputs:

- Panel URL must be HTTP/HTTPS.
- API keys must be passed via environment variables or secret storage.
- Server name must be escaped before writing config files.
- File paths must stay inside the server install folder.
- Recipe URLs should be allowlisted or confirmed.

Do not run destructive file operations outside the Pterodactyl server root.

## Idempotency

The installer should be safe to rerun:

- If the Pterodactyl server exists, update it instead of duplicating it.
- If files exist, back up changed config files before overwriting.
- If txAdmin monitor exists, replace only the txAdmin-managed files.
- If database exists, do not drop it unless explicitly requested.
- Store installer metadata in a file such as:

```json
{
  "installer": "diamondcrew-fivem-pterodactyl",
  "version": 1,
  "serverId": 123,
  "installedAt": 1788970000,
  "txAdminBuild": "diamondcrew"
}
```

## Suggested Implementation Phases

1. Validate Pterodactyl credentials and list available nodes/allocations.
2. Create or select a target Pterodactyl server.
3. Download and extract FXServer artifact.
4. Build txAdmin panel and NUI locally.
5. Upload customized monitor resource.
6. Generate `server.cfg`.
7. Configure txAdmin profile path and startup command.
8. Start server.
9. Poll console/logs until txAdmin reports ready.
10. Return connection details and generated credentials.

## Test Checklist

Before considering the installer complete:

- Server can be created from scratch.
- Re-running installer does not create duplicate servers.
- `server.cfg` contains the correct license key placeholder replacement.
- Pterodactyl console starts FXServer without path errors.
- txAdmin webpanel is reachable.
- DiamondCrew logo appears in webpanel and NUI.
- `setr locale "cs"` enables Czech txAdmin game messages.
- English remains available with `setr locale "en"` and the panel language switch.
- gksphone notifications do not crash when gksphone is missing.
- gksphone notifications show when gksphone is installed.
- Player mugshots do not all refresh at once.
- Player mugshots survive reconnect through txAdmin DB cache.

## Handoff Prompt For Another ChatGPT

Use this prompt when starting a new AI session:

```text
You are building an automatic FiveM server installer for Pterodactyl.

Read docs/diamondcrew-pterodactyl-installer.md first. Implement the installer conservatively and keep secrets out of logs. The installer must provision a Pterodactyl server, install FXServer, deploy the customized DiamondCrew txAdmin monitor resource, generate server.cfg, optionally configure txAdmin recipes/database, and verify startup through Pterodactyl.

Preserve English and Czech language support. Do not hardcode Pterodactyl IDs, ports, license keys, or API tokens. Make file operations idempotent and jailed to the server install folder.
```
