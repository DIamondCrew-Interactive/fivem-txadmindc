#!/bin/bash
set -Eeuo pipefail

fail() {
    echo "[DiamondCrew installer] ERROR: $*" >&2
    exit 1
}

info() {
    echo "[DiamondCrew installer] $*" >&2
}

need_cmd() {
    command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

SERVER_DIR="/mnt/server"
ARTIFACT_INDEX="https://runtime.fivem.net/artifacts/fivem/build_proot_linux/master/"
TXADMIN_REPO="https://github.com/DIamondCrew-Interactive/fivem-txadmindc"
TXADMIN_VERSION="${TXADMIN_VERSION:-v1.0.0}"
TXADMIN_SHA256="${TXADMIN_SHA256:-935871ceed3ef90442e4e60f302b0dfb76e2e5be0c9ec5f649597e5328df8f88}"
TXADMIN_URL="${TXADMIN_REPO}/releases/download/${TXADMIN_VERSION}/monitor.zip"
CFX_DIR="${SERVER_DIR}/alpine/opt/cfx-server"
MONITOR_DIR="${CFX_DIR}/citizen/system_resources/monitor"
MONITOR_BACKUP_DIR="${CFX_DIR}/citizen/system_resources/monitor.stock"

mkdir -p "${SERVER_DIR}"
cd "${SERVER_DIR}"

info "Installing required tools"
apt-get update
apt-get install -y ca-certificates curl grep sed tar unzip xz-utils

need_cmd curl
need_cmd grep
need_cmd sed
need_cmd tar
need_cmd unzip
need_cmd sha256sum

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

resolve_artifact_url() {
    local configured="${FXSERVER_ARTIFACT_URL:-latest}"

    if [ -n "${configured}" ] && [ "${configured}" != "latest" ]; then
        printf '%s\n' "${configured}"
        return 0
    fi

    info "Resolving latest Linux FXServer artifact"
    local page rel
    page="$(curl -fsSL --retry 3 --connect-timeout 20 "${ARTIFACT_INDEX}")" \
        || fail "Could not read FXServer artifact index"

    rel="$(printf '%s' "${page}" \
        | grep -Eo 'href="[0-9]+-[^"]+/fx.tar.xz"' \
        | sed -E 's/^href="//; s/"$//' \
        | head -n 1)"

    [ -n "${rel}" ] || fail "Could not find fx.tar.xz in FXServer artifact index"
    printf '%s%s\n' "${ARTIFACT_INDEX}" "${rel}"
}

ARTIFACT_URL="$(resolve_artifact_url)"
info "Downloading Linux FXServer artifact: ${ARTIFACT_URL}"
curl -fL --retry 3 --connect-timeout 30 "${ARTIFACT_URL}" -o "${TMP_DIR}/fxserver.tar.xz" \
    || fail "FXServer artifact download failed"

info "Extracting FXServer into ${SERVER_DIR}"
tar -xJf "${TMP_DIR}/fxserver.tar.xz" -C "${SERVER_DIR}" \
    || fail "FXServer artifact extraction failed"

[ -f "${CFX_DIR}/FXServer" ] \
    || fail "FXServer artifact did not create alpine/opt/cfx-server/FXServer"

[ -d "${CFX_DIR}/citizen/system_resources" ] \
    || fail "FXServer artifact did not create alpine/opt/cfx-server/citizen/system_resources"

if [ -d "${MONITOR_DIR}" ]; then
    if [ ! -d "${MONITOR_BACKUP_DIR}" ]; then
        info "Backing up stock monitor to alpine/opt/cfx-server/citizen/system_resources/monitor.stock"
        cp -a "${MONITOR_DIR}" "${MONITOR_BACKUP_DIR}" \
            || fail "Could not back up stock monitor"
    else
        info "Stock monitor backup already exists; keeping it"
    fi

    case "${MONITOR_DIR}" in
        "${CFX_DIR}/citizen/system_resources/monitor")
            rm -rf "${MONITOR_DIR}"
            ;;
        *)
            fail "Refusing to remove unexpected monitor path: ${MONITOR_DIR}"
            ;;
    esac
else
    info "Stock monitor directory was not present; continuing"
fi

info "Downloading DiamondCrew txAdmin ${TXADMIN_VERSION}: ${TXADMIN_URL}"
curl -fL --retry 3 --connect-timeout 30 "${TXADMIN_URL}" -o "${TMP_DIR}/monitor.zip" \
    || fail "DiamondCrew txAdmin monitor.zip download failed"

info "Verifying DiamondCrew txAdmin SHA256"
printf '%s  %s\n' "${TXADMIN_SHA256}" "${TMP_DIR}/monitor.zip" | sha256sum -c - \
    || fail "DiamondCrew txAdmin SHA256 mismatch"

info "Extracting DiamondCrew txAdmin monitor"
mkdir -p "${TMP_DIR}/monitor-extract"
unzip -q "${TMP_DIR}/monitor.zip" -d "${TMP_DIR}/monitor-extract" \
    || fail "DiamondCrew txAdmin ZIP extraction failed"

[ -d "${TMP_DIR}/monitor-extract/monitor" ] \
    || fail "DiamondCrew txAdmin ZIP must contain top-level monitor directory"

cp -a "${TMP_DIR}/monitor-extract/monitor" "${MONITOR_DIR}" \
    || fail "Could not install DiamondCrew monitor directory"

for required in \
    entrypoint.js \
    fxmanifest.lua \
    core/index.js \
    panel/index.html \
    nui/index.html \
    panel/images/diamond-circle-logo.png \
    nui/images/diamond-circle-logo.png \
    diamondcrew-build.json
do
    [ -e "${MONITOR_DIR}/${required}" ] || fail "Installed monitor is missing ${required}"
done

mkdir -p "${SERVER_DIR}/txData" "${SERVER_DIR}/server-data"

info "Install complete"
info "FXServer is installed in ${SERVER_DIR}"
info "DiamondCrew txAdmin monitor is installed in alpine/opt/cfx-server/citizen/system_resources/monitor"
info "txData and server-data directories exist and were not removed"
