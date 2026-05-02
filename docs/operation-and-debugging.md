# Betrieb und Debugging

## Schnelltest

```zsh
npm run verify
```

Erwartung:

- TypeScript ohne Fehler
- alle Unit-Tests gruen
- Build erzeugt `com.carlosanderssohn.bookmark-slots.sdPlugin/bin/plugin.js`
- Bundle-Check findet keinen offenen `@elgato/streamdeck`-Import

## Lokal installieren

```zsh
./install-local.sh
```

Danach Stream Deck manuell neu starten.

## Manuelle Plugin-Pruefung

1. Stream Deck neu starten.
2. Aktion `Bookmark Slots -> Bookmark Slot` auf eine Taste ziehen.
3. Chrome mit einem normalen Tab oeffnen.
4. Taste kurz druecken.
5. Erwartung: Button zeigt Favicon und Titel.
6. Taste erneut kurz druecken.
7. Erwartung: gespeicherter Tab wird fokussiert oder URL in Chrome geoeffnet.
8. Taste 1 Sekunde halten und loslassen.
9. Erwartung: Slot wird geloescht und zeigt wieder `Slot N`.

## Datenorte

Plugin-Installation:

```text
/Users/carlosanderssohn/Library/Application Support/com.elgato.StreamDeck/Plugins/com.carlosanderssohn.bookmark-slots.sdPlugin
```

Bookmark-Daten:

```text
/Users/carlosanderssohn/.streamdeck-bookmarks/bookmarks.json
```

Manuelle Backups aus dem Einstellungsbereich werden im selben Ordner abgelegt:

```text
/Users/carlosanderssohn/.streamdeck-bookmarks/bookmarks.backup-<timestamp>.json
```

Exporte aus dem Einstellungsbereich werden im Downloads-Ordner abgelegt:

```text
/Users/carlosanderssohn/Downloads/bookmarks.export-<timestamp>.json
```

Debug-Log:

```text
/Users/carlosanderssohn/.streamdeck-bookmarks/plugin.log
```

## Typische Fehlerbilder

### Aktion taucht nicht in Stream Deck auf

Pruefen:

- wurde `./install-local.sh` erfolgreich ausgefuehrt?
- liegt der Plugin-Ordner unter `~/Library/Application Support/com.elgato.StreamDeck/Plugins/`?
- wurde Stream Deck danach neu gestartet?
- ist `manifest.json` gueltiges JSON?

### Button bleibt leer oder zeigt nur Standardicon

Pruefen:

- `npm run verify`
- `plugin.log`
- Stream Deck neu starten
- keine eigene manuelle Stream-Deck-Titel-/Icon-Ueberschreibung auf der Taste setzen

### Speichern funktioniert nicht

Wahrscheinliche Ursachen:

- Chrome ist geschlossen.
- Chrome hat kein Fenster.
- macOS blockiert AppleScript-Zugriff.
- `osascript` liefert einen Fehler.

Pruefen:

```text
/Users/carlosanderssohn/.streamdeck-bookmarks/plugin.log
```

### Oeffnen springt nicht zum erwarteten Tab

V1 vergleicht URLs exakt. Diese beiden URLs gelten als verschieden:

```text
https://example.com
https://example.com/
```

Wenn dieselbe URL mehrfach offen ist, nimmt das Plugin den ersten gefundenen Tab.

## Build-Hinweis

Rollup nutzt im Projekt die WASM-Variante, weil die native Rollup-Komponente lokal mit macOS-Code-Signaturproblemen aufgefallen ist.

Das Build-Script nutzt `--forceExit`, weil Rollup sonst in dieser Umgebung gelegentlich nach erfolgreichem Build nicht sauber beendet wurde.

## Log-Politik

Das Log soll sparsam bleiben:

- Plugin gestartet
- Slot gespeichert
- Slot geloescht
- Chrome-URL nicht lesbar
- Favicon-Download fehlgeschlagen
- unerwarteter Fehler

Keine vollstaendige Surf-Historie loggen.

## Backup, Export und Import

Der Einstellungsbereich jeder `Bookmark Slot`-Taste enthaelt einen Bereich `Alle Links`.

- `Backup erstellen`: sichert alle gespeicherten Plugin-Links als Datei im Datenordner.
- `Export in Downloads`: schreibt die aktuelle Bookmark-Datei als JSON in den Downloads-Ordner.
- `Import auswaehlen`: ersetzt alle gespeicherten Plugin-Links durch eine ausgewaehlte JSON-Datei.

Beim Import wird vorher automatisch ein Backup der aktuellen Daten angelegt. Ungueltige Import-Dateien werden abgelehnt und ersetzen die bestehende Datei nicht.
