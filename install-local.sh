#!/bin/zsh
# Build, verify, and install the local Stream Deck plugin for this Mac.
#
# The script copies the .sdPlugin folder into Stream Deck's local plugin folder.
# It intentionally does not restart Stream Deck; restart it manually after
# installation so failures are easier to reason about.
set -euo pipefail

PLUGIN_NAME="com.carlosanderssohn.bookmark-slots.sdPlugin"
SOURCE_DIR="${PWD}/${PLUGIN_NAME}"
TARGET_PARENT="${HOME}/Library/Application Support/com.elgato.StreamDeck/Plugins"
TARGET_DIR="${TARGET_PARENT}/${PLUGIN_NAME}"
TEMP_DIR="${TARGET_PARENT}/.${PLUGIN_NAME}.tmp"

npm run verify

if [[ "${TARGET_DIR}" != */"${PLUGIN_NAME}" ]]; then
  print -u2 -- "Unerwarteter Zielpfad: ${TARGET_DIR}"
  exit 1
fi

mkdir -p "${TARGET_PARENT}"
rm -rf "${TEMP_DIR}"
cp -R "${SOURCE_DIR}" "${TEMP_DIR}"
rm -rf "${TARGET_DIR}"
mv "${TEMP_DIR}" "${TARGET_DIR}"

print -- "Plugin installiert: ${TARGET_DIR}"
print -- "Bitte Stream Deck manuell neu starten."
