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

## Firefox-Pruefung

1. Stream Deck neu starten.
2. In die Zwischenablage einen erkennbaren Text legen.
3. Firefox mit einem normalen `https`-Tab oeffnen und im Vordergrund lassen.
4. Leeren Bookmark-Slot kurz druecken.
5. Erwartung: Slot speichert die aktive Firefox-URL.
6. Erwartung: der vorherige Zwischenablage-Text ist wieder da.
7. Gespeicherten Firefox-Slot kurz druecken.
8. Erwartung: Firefox oeffnet die URL. Vorhandene Firefox-Tabs werden nicht gezielt fokussiert.

Hinweis: Fuer Firefox-Speichern braucht Stream Deck bzw. das Plugin macOS-Bedienungshilfen-Rechte, weil `Cmd+L` und `Cmd+C` an Firefox gesendet werden.

## YouTube in Firefox pruefen

1. Im Einstellungsbereich einer Bookmark-Taste `YouTube in Firefox oeffnen` aktivieren.
2. Einen gespeicherten YouTube-Link oeffnen, auch wenn er urspruenglich aus Chrome oder Safari stammt.
3. Erwartung: Firefox oeffnet die URL.
4. Einen gespeicherten Nicht-YouTube-Link oeffnen.
5. Erwartung: der gespeicherte Browser wird weiter genutzt.

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
- Firefox ist nicht im Vordergrund oder hat keine normale `http`-/`https`-URL in der Adresszeile.
- macOS blockiert AppleScript-Zugriff.
- macOS blockiert Bedienungshilfen-Zugriff fuer Firefox-Tastaturbefehle.
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

Firefox-Einschraenkung: Firefox-Links werden geoeffnet, aber vorhandene Firefox-Tabs werden nicht gesucht oder fokussiert.

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
