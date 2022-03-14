#!/bin/zsh
# shellcheck disable=SC2154
LIBRARY="${bibtex_library_path/#\~/$HOME}"
BUFFER="$alfred_workflow_data/buffer.json"
LAST_VERSION_FILE="$alfred_workflow_data"/last_version

# create folder, if not existing yet (e.g. first run)
[[ ! -d "$alfred_workflow_data" ]] && mkdir -p "$alfred_workflow_data"

# reload buffer for new version to ensure new features/bug fixes take effect
touch "$LAST_VERSION_FILE"
[[ -e "$LAST_VERSION_FILE" ]] && LAST_RUN_VERSION=$(head -n1 "$LAST_VERSION_FILE")
THIS_VERSION="$alfred_workflow_version"

# reload buffer if
# - outdated
# - manually requested reload
# - new workflow version
if [[ "$LIBRARY" -nt "$BUFFER" ]] \
	|| [[ "$buffer_reload" == "true" ]] \
	|| [[ "$LAST_RUN_VERSION" != "$THIS_VERSION" ]] \
	; then
		osascript -l JavaScript "./scripts/buffer_writer.js" > "$BUFFER"
		echo -n "$THIS_VERSION" > "$LAST_VERSION_FILE"
		osascript -e "beep"
fi

cat "$BUFFER"
