# Bookmark Slots

Browser tabs as reusable Stream Deck buttons on macOS. Save the current tab, return to an existing Chrome or Safari tab, or open the saved URL with one press.

## Status and requirements

Early personal project, version 0.1.0. No packaged GitHub release is available yet. The source is MIT-licensed.

- macOS 13 or later and Stream Deck software 7.1 or later, as declared in the plugin manifest.
- A Stream Deck keypad and Chrome, Safari, or Firefox.
- Node.js 22 and npm for the development commands below. The plugin manifest selects the bundled Node.js 20 runtime in Stream Deck.
- macOS Automation permission for browser control; Firefox capture also requires Accessibility permission.

## What the buttons do

| Action | Result |
| --- | --- |
| Short press on an empty slot | Save the foreground browser tab |
| Short press on a saved slot | Focus the matching Chrome/Safari tab, or open the URL |
| Double press on an empty slot | Save and close the matching Chrome/Safari tab |
| Hold for at least one second, then release | Clear the slot |

Firefox capture uses the address bar and clipboard. Firefox does not support existing-tab lookup or automatic tab closing here; its initial bookmark title is the URL. The previous text clipboard is restored, but non-text clipboard contents are not guaranteed to survive this capture path.

The settings panel supports slot numbers, custom titles, backup, export, import, and optional YouTube routing to Firefox. Import replaces all saved links and creates a backup first. Multiple buttons using the same slot share the same bookmark.

## Build and verify

```sh
npm ci
npm run verify
```

Verification runs TypeScript checks, unit tests, the bundle build, and a check for unresolved Stream Deck SDK imports. It does not verify physical button interaction or macOS permissions.

## Install locally

From the repository root, after building:

```sh
./install-local.sh
```

This replaces the existing installation of this plugin under `~/Library/Application Support/com.elgato.StreamDeck/Plugins/`. Restart Stream Deck manually and add the **Bookmark Slot** action. The installer does not delete the separate bookmark data directory.

## Data and network behavior

Bookmarks and backups live in `~/.streamdeck-bookmarks/`; exports go to `~/Downloads/`. Bookmark files contain browsing information and should not be attached to public issues.

Favicon loading sends the bookmarked hostname to Google's favicon service. This is a network-enabled feature, even though bookmark storage is local. See [PRIVACY.md](PRIVACY.md).

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md), [architecture](docs/architecture.md), and [operation and debugging](docs/operation-and-debugging.md). Some older development notes describe the author's personal setup and are not a support guarantee.

[MIT License](LICENSE). This is an independent project, not an official Elgato or browser-vendor product.
