# AGENTS.md

## Zweck dieses Repositories

Dieses Repository enthaelt ein lokales Stream-Deck-Plugin fuer Carlos.
Das Plugin heisst **Bookmark Slots** und macht Stream-Deck-Tasten zu dynamischen Browser-Bookmark-Slots.

Der aktuelle Stand funktioniert bereits produktiv lokal:

- Stream-Deck-Aktion: `Bookmark Slot`
- kurzer Tastendruck auf leeren Slot: aktiven Chrome-, Safari- oder Firefox-Tab speichern
- kurzer Tastendruck auf belegten Slot: gespeicherte URL oeffnen oder vorhandenen Tab fokussieren
- langer Tastendruck ab 1 Sekunde: Slot loeschen
- Buttonbild wird dynamisch aus schwarzem Hintergrund, Favicon und 7+7 Zeichen Titel erzeugt
- Daten liegen unter `~/.streamdeck-bookmarks/bookmarks.json`

## Nutzerkontext

Carlos hat keine Programmierkenntnisse. Antworten muessen kurz, konkret und verstaendlich sein.
Bei riskanten Aktionen vorher kurz erklaeren, was passiert.

Wichtige Antwortregeln:

- Ja/Nein-Fragen sehr kurz beantworten.
- Keine langen Abschlusszusammenfassungen.
- Fachbegriffe kurz erklaeren, z. B. `Branch` als Entwicklungszweig.
- Nichts erfinden. Unsicherheit konkret benennen.

## Wichtige Dateien

- `src/actions/bookmark-slot.ts`: Hauptlogik der Stream-Deck-Taste.
- `src/bookmarks/store.ts`: JSON-Speicherung und Schutz gegen Datenverlust.
- `src/browser/chrome.ts`: AppleScript-Steuerung fuer Chrome.
- `src/browser/safari.ts`: AppleScript-Steuerung fuer Safari.
- `src/browser/firefox.ts`: eingeschraenkte Firefox-Steuerung per `Cmd+L`, `Cmd+C`.
- `src/render/button-image.ts`: erzeugt das dynamische Button-SVG.
- `src/favicon/favicon.ts`: laedt Favicons ueber Google-Favicon-Dienst oder nutzt Chrome-Fallback.
- `com.carlosanderssohn.bookmark-slots.sdPlugin/manifest.json`: Stream-Deck-Manifest.
- `com.carlosanderssohn.bookmark-slots.sdPlugin/ui/bookmark-slot.html`: Einstellungsbereich in Stream Deck.
- `install-local.sh`: baut, prueft und installiert das Plugin lokal.
- `docs/architecture.md`: Einstieg in Aufbau und Datenfluss.
- `docs/operation-and-debugging.md`: Betrieb, Test und Fehlersuche.
- `docs/future-ideas.md`: offene Ideen und naechste Ausbaustufen.

## Build und Test

Standardpruefung:

```zsh
npm run verify
```

Das fuehrt aus:

- TypeScript-Typpruefung
- Unit-Tests
- Bundle-Build
- Bundle-Check gegen offene `@elgato/streamdeck`-Imports

Lokale Installation:

```zsh
./install-local.sh
```

Danach Stream Deck manuell neu starten.

## Technische Leitplanken

- Keine volle Veroeffentlichung/Packaging fuer Marketplace bauen; es ist nur fuer Carlos lokal.
- Keine macOS-Notifications. Feedback kommt ueber Buttonbild oder `showAlert`.
- `titleOverride` gehoert in die gemeinsame JSON-Slot-Datei, nicht in einzelne Action-Settings.
- Action-Settings enthalten nur die Slotnummer.
- Zwei sichtbare Tasten mit gleicher Slotnummer muessen denselben Bookmark zeigen und gemeinsam aktualisiert werden.
- JSON-Schreibzugriffe muessen serialisiert bleiben, sonst koennen Bookmarks verloren gehen.
- Property-Inspector-Nachrichten muessen `action` und `context` senden.
- `streamDeck.ui.sendToPropertyInspector(...)` sendet an den aktuell sichtbaren Inspector. Nicht ungefiltert mit Daten anderer Slots fuettern.

## Vor Aenderungen

1. Erst `docs/architecture.md` und `docs/future-ideas.md` lesen.
2. Dann relevante Datei(en) inspizieren.
3. Bei Feature-Aenderungen zuerst Tests fuer reine Logik schreiben.
4. Nach Aenderungen mindestens `npm run verify` ausfuehren.
5. Wenn Plugin-Verhalten betroffen ist: `./install-local.sh`, Stream Deck neu starten, manuell testen.

## Arbeitsweise mit Sub-Agents

Wenn die Umgebung Sub-Agents anbietet und der Nutzer nichts Gegenteiliges sagt:

- Fuer groessere Features Sub-Agents aktiv nutzen.
- Mindestens ein Sub-Agent soll Plan/Spec gegen die Anforderungen pruefen.
- Mindestens ein Sub-Agent soll nach der Implementierung Code-Review machen.
- Bei riskanten technischen Punkten getrennte Explorer-Sub-Agents einsetzen, z. B. fuer SDK-Doku, Build-System oder AppleScript.
- Findings ernst nehmen und P1/P2-Probleme vor Abschluss beheben.
- Danach erneut `npm run verify` ausfuehren.

Diese Arbeitsweise hat beim initialen Plugin-Bau sehr gut funktioniert und soll bevorzugt wiederholt werden.

## Aktuelle bekannte Einschraenkungen

- Chrome und Safari koennen bestehende Tabs suchen/fokussieren.
- Firefox kann speichern und oeffnen, sucht/fokussiert aber keine bestehenden Tabs.
- Firefox-Speichern nutzt `Cmd+L`, `Cmd+C` und braucht macOS-Bedienungshilfen-Rechte.
- Favicons kommen aktuell ueber Google-Favicon-Dienst; interne URLs und localhost nutzen meist Chrome-Fallback.
- Plugin legt keine Stream-Deck-Ordner automatisch an; das ist eine Zukunftsidee und muss erst auf SDK-Machbarkeit geprueft werden.
- Sammlungsmodus ist als naechstes groesseres Feature dokumentiert in `docs/collection-mode-requirements.md`.
