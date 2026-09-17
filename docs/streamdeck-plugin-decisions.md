# Stream Deck Bookmark Plugin - Entscheidungen

Stand: 2026-05-03

## Ziel

Ein lokales, echtes Stream-Deck-Plugin fuer ein Stream Deck MK.2 mit dynamischen Bookmark-Buttons.

## Aktueller Status

- Plugin ist implementiert und lokal erfolgreich getestet.
- Aktion `Bookmark Slot` kann auf Stream-Deck-Tasten gelegt werden.
- Speichern, Oeffnen/Fokussieren und Loeschen per langem Druck funktionieren.
- Die lokale Installation liegt unter:
  - `~/Library/Application Support/com.elgato.StreamDeck/Plugins/com.carlosanderssohn.bookmark-slots.sdPlugin`
- Einstieg fuer neue KI-Chats:
  - `AGENTS.md`
  - `docs/architecture.md`
  - `docs/operation-and-debugging.md`
  - `docs/future-ideas.md`

## Grundverhalten

- Eine Plugin-Aktion: `Bookmark Slot`.
- Jede Taste bekommt eine Slotnummer.
- Beim Hinzufuegen soll automatisch die naechste freie Slotnummer vorgeschlagen werden.
- Die Slotnummer kann im Einstellungsbereich manuell ueberschrieben werden.
- Zwei Tasten mit gleicher Slotnummer zeigen und steuern denselben Bookmark.
- Normaler Druck:
  - leerer Slot: aktive URL aus dem vordersten unterstuetzten Browser speichern.
  - belegter Slot: gespeicherte URL im gespeicherten Browser oeffnen oder, bei Chrome/Safari, vorhandenen Tab fokussieren.
  - wenn beim Speichern kein unterstuetzter Browser vorn ist: nichts speichern, `showAlert` anzeigen.
- Langer Druck:
  - 1 Sekunde halten.
  - Loeschen erst beim Loslassen.
  - ohne Nachfrage loeschen.
- Keine macOS-Notifications; sichtbares Feedback kommt ueber Titel/Icon.
- Bei echten Fehlern `showAlert` auf dem Button nutzen.

## Browser

- Chrome und Safari werden voll unterstuetzt: speichern, oeffnen und vorhandenen Tab per exaktem URL-Vergleich fokussieren.
- Firefox wird eingeschraenkt unterstuetzt: speichern und oeffnen, aber keine vorhandenen Firefox-Tabs suchen/fokussieren.
- Firefox-Speichern nutzt `Cmd+L`, `Cmd+C` auf der Firefox-Adresszeile und stellt die vorherige Text-Zwischenablage wieder her.
- Firefox braucht dafuer macOS-Bedienungshilfen-Rechte.
- YouTube-URLs koennen global optional in Firefox geoeffnet werden.
- Wenn dieselbe URL in Chrome/Safari mehrfach offen ist, wird der erste gefundene Tab verwendet.
- URL-Vergleich ist exakt.

## Anzeige

- Buttonbild wird als fertiges 144x144-Bild erzeugt.
- Hintergrund: schwarz.
- Text: weiss.
- Mitte: Website-Favicon.
- Favicon: ca. 64x64 px, leicht abgerundete Ecken.
- Titel:
  - Tab-Titel aus Chrome/Safari verwenden.
  - Firefox speichert als Titel erstmal die URL.
  - erste 14 Zeichen.
  - Zeichen 1-7 oben, Zeichen 8-14 unten.
  - wenn kuerzer als 8 Zeichen: oben kompletter Titel, unten leer.
- Leerer Slot:
  - zeigt Slotnummer, z. B. `Slot 1`.
  - Plus-/Bookmark-Icon.
- Favicon:
  - v1 darf den Google-Favicon-Dienst nutzen.
  - bei internen URLs oder Fehlern Chrome-Icon verwenden.
  - beim Start fehlende Favicons oder Chrome-Fallbacks einmal sparsam neu versuchen.

## Einstellungen pro Taste

- Slotnummer anzeigen und bearbeitbar machen.
- gespeicherte URL nur anzeigen, nicht bearbeitbar.
- Titel anzeigen und bearbeitbar machen.
- Kein Loeschbutton im Einstellungsbereich.
- Manueller Titel gilt nur fuer den aktuellen Bookmark.
- Nach Loeschen und neuem Speichern wird wieder der neue Seitentitel verwendet.
- Gespeicherte URL ist nur Anzeige, nicht editierbar.

## Speicherung

- JSON-Datei:
  - `~/.streamdeck-bookmarks/bookmarks.json`
- Debug-Log:
  - `~/.streamdeck-bookmarks/plugin.log`
- Keine Migration aus dem alten Script-MVP.
- Slots speichern intern `createdAt` und `updatedAt`.
- Keine feste maximale Slotnummer.
- Automatische Slotnummer-Vergabe beruecksichtigt sichtbare/konfigurierte Plugin-Tasten, nicht alte JSON-Eintraege.
- Gespeicherte Slots bleiben erhalten, wenn eine Taste entfernt wird; keine automatische Loeschung.
- Keine automatische Bereinigung verwaister Slots in v1.
- Installierter Script-MVP-Ordner wurde auf Wunsch bereits geloescht:
  - `~/Scripts/streamdeck-bookmarks`
- Alte Script-MVP-Dateien im Projektordner wurden ebenfalls geloescht:
  - `streamdeck-bookmark.sh`
  - `streamdeck-clear-bookmark.sh`
  - `README.md`
- Debug-Log bleibt sparsam:
  - Plugin gestartet.
  - Slot gespeichert/geloescht.
  - Chrome-URL nicht lesbar.
  - Favicon-Download fehlgeschlagen.
  - unerwarteter Fehler.

## Technik

- Lokales Plugin, keine Veroeffentlichung.
- Projekt im Ordner:
  - `~/Documents/Stream-Deck_Browser-Bookmark`
- Lokale Installation spaeter nach:
  - `~/Library/Application Support/com.elgato.StreamDeck/Plugins/`
- Node.js/JavaScript ist okay.
- TypeScript ist bevorzugt.
- Offizielle Elgato-Node-Bibliothek darf installiert werden.
- Moeglichst keine schweren Zusatzbibliotheken.
- Buttonbild bevorzugt als SVG/Data-URL erzeugen.
- Lokales Installationsscript `install-local.sh` einplanen:
  - Plugin bauen.
  - alte lokale Plugin-Version ersetzen.
  - in den Stream-Deck-Plugin-Ordner kopieren.
  - Stream Deck nicht automatisch neu starten; Nutzer startet manuell neu.

## Lokale Pruefung

- Terminal-Node vorhanden: `v24.14.0`.
- npm vorhanden: `11.11.0`.
- Stream Deck bringt Node `20.20.0` mit.
- Stream Deck Plugin-Ordner existiert.

## Offizielle Doku, die fuer den Plan relevant ist

- Manifest: https://docs.elgato.com/sdk/plugins/manifest
- Plugin Environment: https://docs.elgato.com/streamdeck/sdk/introduction/plugin-environment/
- Keys: https://docs.elgato.com/streamdeck/sdk/guides/keys
- Settings: https://docs.elgato.com/streamdeck/sdk/guides/settings/
