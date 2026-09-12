# DiamondCrew FiveM txAdmin Pterodactyl Egg

Import file:

```text
pterodactyl/egg-diamondcrew-fivem-txadmin.json
```

Standalone install script copy:

```text
pterodactyl/install-diamondcrew-fivem.sh
```

## What The Egg Does

- Downloads a Linux FXServer artifact into `/mnt/server`.
- Preserves the rest of the FXServer artifact.
- Finds `alpine/opt/cfx-server/citizen/system_resources/monitor/`.
- Backs up the first stock monitor to `alpine/opt/cfx-server/citizen/system_resources/monitor.stock`.
- Replaces only `alpine/opt/cfx-server/citizen/system_resources/monitor/`.
- Downloads DiamondCrew txAdmin from:

```text
https://github.com/DIamondCrew-Interactive/fivem-txadmindc/releases/download/${TXADMIN_VERSION}/monitor.zip
```

- Verifies `monitor.zip` with SHA256 before extraction.
- Extracts it so the final runtime path is:

```text
/mnt/server/alpine/opt/cfx-server/citizen/system_resources/monitor/
```

- Creates `txData` and `server-data` without deleting user data on reinstall.

## Startup Command

The txAdmin path uses `TXHOST_*` environment variables and starts FXServer without deprecated txAdmin ConVars:

```sh
TXHOST_DATA_PATH=/home/container/txData \
TXHOST_GAME_NAME=fivem \
TXHOST_TXA_PORT={{TXADMIN_PORT}} \
TXHOST_FXS_PORT={{SERVER_PORT}} \
TXHOST_INTERFACE=0.0.0.0 \
TXHOST_MAX_SLOTS={{SERVER_MAX_PLAYERS}} \
TXHOST_TXA_URL={{TXADMIN_PUBLIC_URL}} \
TXHOST_DEFAULT_CFXKEY={{FIVEM_LICENSE_KEY}} \
cd /home/container && \
/home/container/alpine/opt/cfx-server/ld-musl-x86_64.so.1 \
--library-path "/home/container/alpine/usr/lib/v8/:/home/container/alpine/lib/:/home/container/alpine/usr/lib/" \
-- /home/container/alpine/opt/cfx-server/FXServer
```

The egg startup includes a direct FXServer fallback when `TXADMIN_ENABLED` is `false` or `0`:

```sh
if [ "{{TXADMIN_ENABLED}}" = "false" ] || [ "{{TXADMIN_ENABLED}}" = "0" ]; then cd /home/container && exec /home/container/alpine/opt/cfx-server/ld-musl-x86_64.so.1 --library-path "/home/container/alpine/usr/lib/v8/:/home/container/alpine/lib/:/home/container/alpine/usr/lib/" -- /home/container/alpine/opt/cfx-server/FXServer +exec server-data/server.cfg; else cd /home/container && TXHOST_DATA_PATH=/home/container/txData TXHOST_GAME_NAME=fivem TXHOST_TXA_PORT={{TXADMIN_PORT}} TXHOST_FXS_PORT={{SERVER_PORT}} TXHOST_INTERFACE=0.0.0.0 TXHOST_MAX_SLOTS={{SERVER_MAX_PLAYERS}} TXHOST_TXA_URL="{{TXADMIN_PUBLIC_URL}}" TXHOST_DEFAULT_CFXKEY="{{FIVEM_LICENSE_KEY}}" exec /home/container/alpine/opt/cfx-server/ld-musl-x86_64.so.1 --library-path "/home/container/alpine/usr/lib/v8/:/home/container/alpine/lib/:/home/container/alpine/usr/lib/" -- /home/container/alpine/opt/cfx-server/FXServer; fi
```

For DiamondCrew deployments, keep `TXADMIN_ENABLED=true`.

## Variables

| Variable | Default | Required | Notes |
| --- | --- | --- | --- |
| `FIVEM_LICENSE_KEY` | empty | no | Mapped to `TXHOST_DEFAULT_CFXKEY` for txAdmin deployer prefill. Do not commit secrets. |
| `TXADMIN_PORT` | `33031` | yes | Must be a Pterodactyl allocation. |
| `TXADMIN_PUBLIC_URL` | empty | no | Public txAdmin URL, for example `https://tx-dev.pmrp.cz`. |
| `FXSERVER_ARTIFACT_URL` | `latest` | yes | Use `latest` or a direct Linux `fx.tar.xz` URL. Pin a URL for repeatable production deploys. |
| `SERVER_MAX_PLAYERS` | `48` | yes | Used by the direct FXServer fallback. |
| `SERVER_NAME` | `DiamondCrew FiveM` | yes | Display name/default metadata. |
| `TXADMIN_ENABLED` | `true` | yes | Keep enabled for this custom txAdmin. |
| `TXADMIN_VERSION` | `v1.0.12` | yes | GitHub Release tag. |
| `TXADMIN_SHA256` | `4f11b66516c857c7ebb0084bda5f298a1a5a2ff06ae01ebec6bbfded56f4d6e9` | yes | Must match `monitor.zip`. |

## Import Procedure

1. Open Pterodactyl admin panel.
2. Go to `Nests`.
3. Create or select a FiveM-related nest.
4. Click `Import Egg`.
5. Upload `pterodactyl/egg-diamondcrew-fivem-txadmin.json`.
6. Save the egg.
7. Create a new server using this egg.
8. Assign the normal FiveM game port allocation and one extra allocation for txAdmin.
9. Set the startup variables.
10. Install the server.
11. Start the server and open txAdmin on the configured txAdmin allocation.

## First Deployment Values

Use these values for `Prismatic Roleplay - DEV`:

| Setting | Value |
| --- | --- |
| Server name | `Prismatic Roleplay - DEV` |
| FiveM allocation | `30131` |
| txAdmin allocation | `33031` |
| `TXADMIN_PORT` | `33031` |
| `TXADMIN_PUBLIC_URL` | `https://tx-dev.pmrp.cz` |
| `TXADMIN_VERSION` | `v1.0.12` |
| `TXADMIN_SHA256` | `4f11b66516c857c7ebb0084bda5f298a1a5a2ff06ae01ebec6bbfded56f4d6e9` |
| `TXADMIN_ENABLED` | `true` |
| `FXSERVER_ARTIFACT_URL` | `https://runtime.fivem.net/artifacts/fivem/build_proot_linux/master/35245-6efb47dff473c0e2a12fb50b08d74c0eb24a50d5/fx.tar.xz` |
| `SERVER_NAME` | `Prismatic Roleplay - DEV` |
| `SERVER_MAX_PLAYERS` | choose the DEV slot count, for example `48` |
| `FIVEM_LICENSE_KEY` | set in Pterodactyl, never commit it |

## Port And Allocation Notes

- `TXADMIN_PORT` must be exposed as its own allocation. If `33031` is not assigned to the server, the panel may run internally but will not be reachable.
- The normal FiveM allocation `30131` and txAdmin allocation `33031` cannot be used by another server on the same node/IP.
- If the node is behind a firewall or proxy, both allocations must be allowed there too.
- If `FXSERVER_ARTIFACT_URL=latest`, reinstalling later can pull a newer FXServer artifact. For production, pin a direct Linux artifact URL after testing.
- On 2026-09-09, the FiveM artifact page listed build `35245` as `LATEST RECOMMENDED`; that is the pinned URL shown above.
- The installer only removes `alpine/opt/cfx-server/citizen/system_resources/monitor/` inside `/mnt/server`; it does not delete `server-data` or `txData`.
