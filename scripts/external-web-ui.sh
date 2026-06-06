#!/usr/bin/env bash
set -euo pipefail

service_label="com.seonwoo.ekko-hermes-web-ui"
plist_path="${HOME}/Library/LaunchAgents/${service_label}.plist"
user_id="$(id -u)"
gui_domain="gui/${user_id}"
service_target="${gui_domain}/${service_label}"

usage() {
  printf 'Usage: %s {stop|start|restart|status}\n' "$(basename "$0")" >&2
  printf '\n' >&2
  printf 'Controls the external Hermes Web UI launch agent on port 8648.\n' >&2
}

require_macos() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    printf 'This helper only supports macOS launchctl.\n' >&2
    exit 1
  fi
}

require_plist() {
  if [[ ! -f "$plist_path" ]]; then
    printf 'LaunchAgent plist not found: %s\n' "$plist_path" >&2
    exit 1
  fi
}

stop_service() {
  require_macos
  launchctl bootout "$gui_domain" "$plist_path"
}

start_service() {
  require_macos
  require_plist
  launchctl bootstrap "$gui_domain" "$plist_path"
  launchctl kickstart -k "$service_target"
}

restart_service() {
  require_macos
  require_plist
  launchctl bootout "$gui_domain" "$plist_path" || true
  launchctl bootstrap "$gui_domain" "$plist_path"
  launchctl kickstart -k "$service_target"
}

status_service() {
  require_macos
  launchctl print "$service_target"
}

command="${1:-}"
case "$command" in
  stop)
    stop_service
    ;;
  start)
    start_service
    ;;
  restart)
    restart_service
    ;;
  status)
    status_service
    ;;
  -h|--help|help|'')
    usage
    ;;
  *)
    usage
    exit 2
    ;;
esac
