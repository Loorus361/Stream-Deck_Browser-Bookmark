# Data and privacy

Bookmark URLs, titles, browser choice, favicon data and timestamps are stored locally in `~/.streamdeck-bookmarks/bookmarks.json`. URLs can contain confidential paths or query parameters. Backups and exports contain the saved bookmark data as well.

The plugin requests favicons from `https://www.google.com/s2/favicons`, passing the bookmark hostname. Google receives that hostname and normal network request metadata. The favicon request does not intentionally include the full page path or query string. Some local/non-web addresses use a fallback icon.

Chrome and Safari are controlled through macOS AppleScript. Firefox capture uses simulated address-bar copy and temporarily changes the clipboard. Only restoration of text clipboard content is supported by that path.

The plugin writes a local log. Review logs and screenshots before sharing them. Use synthetic `example.com` bookmarks when reporting problems; do not upload real bookmark files.
