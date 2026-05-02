# Collection Mode Requirements

Stand: 2026-05-02

## Ziel

Das bestehende Stream-Deck-Plugin **Bookmark Slots** soll einen Sammlungsmodus bekommen.
Eine Stream-Deck-Seite mit z. B. 14 Bookmark-Slots plus 1 Steuer-Taste soll zwischen mehreren thematischen Sammlungen wechseln koennen.

Beispiel:

- Sammlung `Recherche Steuer`
- Sammlung `Koreanisch`
- Sammlung `YouTube`
- Sammlung `Arbeit`

Wenn die aktive Sammlung wechselt, zeigen dieselben Slot-Tasten andere gespeicherte Links.

## Kernidee

Aktuell ist ein Bookmark durch eine Slotnummer bestimmt:

```text
slot: 1
```

Mit Sammlungsmodus wird ein Bookmark durch Sammlung plus Slot bestimmt:

```text
collectionId: "koreanisch"
slot: 1
```

Das bedeutet:

```text
Sammlung Koreanisch, Slot 1 = Naver Dictionary
Sammlung Arbeit, Slot 1 = Kalender
Sammlung YouTube, Slot 1 = YouTube Studio
```

Die physische Stream-Deck-Taste bleibt dieselbe. Nur die aktive Sammlung entscheidet, welcher Bookmark angezeigt und genutzt wird.

## Gewuenschtes Layout

Carlos nutzt auf dem Stream Deck MK.2 typischerweise:

- 14 Bookmark-Slot-Tasten
- 1 Steuer-Taste

Die Steuer-Taste ist eine neue Plugin-Aktion, z. B.:

```text
Collection Switcher
```

Die vorhandene Aktion bleibt:

```text
Bookmark Slot
```

## Verhalten Bookmark Slot

Jede Bookmark-Slot-Taste hat weiterhin eine Slotnummer.

Neu:

- Die Taste nutzt immer die aktuell aktive Sammlung.
- Wenn Sammlung `Koreanisch` aktiv ist, arbeitet Slot 1 mit `Koreanisch / Slot 1`.
- Wenn Sammlung `Arbeit` aktiv ist, arbeitet Slot 1 mit `Arbeit / Slot 1`.

Kurzer Druck:

- leerer Slot in aktueller Sammlung: aktiven Chrome-Tab speichern
- belegter Slot in aktueller Sammlung: gespeicherte URL oeffnen oder vorhandenen Tab fokussieren

Langer Druck:

- gespeicherten Slot in aktueller Sammlung loeschen
- andere Sammlungen bleiben unveraendert

Buttonbild:

- zeigt den Bookmark der aktuell aktiven Sammlung
- wenn leer: zeigt weiter `Slot N`
- optional spaeter: kleine Sammlungsmarkierung, falls Orientierung noetig ist

## Verhalten Collection Switcher

Neue Aktion:

```text
Collection Switcher
```

Kurzer Druck:

- wechselt zur naechsten Sammlung
- alle sichtbaren Bookmark-Slot-Tasten aktualisieren sich sofort

Optional spaeter:

- langer Druck oeffnet/aktiviert vorherige Sammlung
- Doppelklick erstellt neue Sammlung
- Property Inspector erlaubt Sammlung umzubenennen oder aus Liste zu waehlen

Fuer v1 Sammlungsmodus:

- kurzer Druck reicht zum Durchschalten
- keine automatische Stream-Deck-Ordner-Erstellung
- keine komplexe Sammlungsverwaltung noetig

## Anzeige Collection Switcher

Die Steuer-Taste muss klar zeigen, welche Sammlung aktiv ist.

Buttonbild:

- schwarzer Hintergrund
- weisser Text
- Sammlungsname gekuerzt, aehnlich wie bei Bookmark-Titeln
- moeglich: oben erste 7 Zeichen, unten naechste 7 Zeichen

Beispiel:

```text
Koreani
sch
```

## Datenmodell

Aktuelles Datenmodell:

```json
{
  "version": 1,
  "slots": {
    "1": {
      "slot": 1,
      "url": "https://example.com"
    }
  }
}
```

Zielmodell fuer Sammlungen, Vorschlag:

```json
{
  "version": 2,
  "activeCollectionId": "default",
  "collections": {
    "default": {
      "id": "default",
      "name": "Standard",
      "slots": {
        "1": {
          "slot": 1,
          "url": "https://example.com",
          "title": "Example",
          "titleOverride": "Optional",
          "browser": "chrome",
          "faviconDataUrl": "data:image/png;base64,...",
          "faviconSource": "google",
          "createdAt": "2026-05-02T12:00:00.000Z",
          "updatedAt": "2026-05-02T12:00:00.000Z"
        }
      }
    }
  }
}
```

Migration:

- bestehende `version: 1` Daten sollen in eine Sammlung `Standard` ueberfuehrt werden
- keine gespeicherten Bookmarks verlieren
- vor Migration Backup schreiben, z. B.:

```text
bookmarks.pre-collections-<timestamp>.json
```

## Collection-Erstellung

Noch nicht final entschieden.

Empfohlener v1-Ansatz:

- Property Inspector der `Collection Switcher`-Taste zeigt:
  - aktuelle Sammlung
  - einfache Liste vorhandener Sammlungen
  - Button/ Eingabe fuer neue Sammlung
  - Umbenennen der aktiven Sammlung

Alternative, falls UI klein bleiben soll:

- feste Start-Sammlungen:
  - `Standard`
  - `Sammlung 2`
  - `Sammlung 3`
- Namen spaeter editierbar

Offene Frage fuer naechsten Chat:

- Soll v1 direkt Sammlung erstellen/umbenennen koennen oder erst nur zwischen vorhandenen Sammlungen wechseln?

## Stream-Deck-Ordner

Wichtig:

- Das Plugin soll vorerst **keine echten Stream-Deck-Ordner automatisch anlegen**.
- Die SDK-Machbarkeit ist unklar.
- Sammlungsmodus ist die bevorzugte Alternative, weil er innerhalb der bestehenden Plugin-Actions funktioniert.

## Akzeptanzkriterien

- Eine neue Aktion `Collection Switcher` ist in Stream Deck verfuegbar.
- `Bookmark Slot`-Tasten nutzen die aktive Sammlung.
- Umschalten der Sammlung aktualisiert alle sichtbaren Bookmark-Slot-Tasten.
- Slot 1 kann in verschiedenen Sammlungen unterschiedliche Links speichern.
- Loeschen betrifft nur den Slot in der aktiven Sammlung.
- Bestehende Daten aus `version: 1` werden sicher migriert oder bleiben per Backup wiederherstellbar.
- `npm run verify` bleibt gruen.
- Installation erfolgt weiter mit `./install-local.sh`.

## Testfaelle

1. Mit bestehenden v1-Daten starten.
2. Plugin migriert zu `version: 2`.
3. `Standard / Slot 1` zeigt bisherigen Link.
4. Neue Sammlung `Koreanisch` anlegen oder aktivieren.
5. `Koreanisch / Slot 1` ist leer.
6. In `Koreanisch / Slot 1` Link speichern.
7. Zurueck zu `Standard` wechseln.
8. `Standard / Slot 1` zeigt wieder den alten Link.
9. Langer Druck auf `Standard / Slot 1` loescht nur diesen Slot.
10. `Koreanisch / Slot 1` bleibt erhalten.

## Spaetere Ideen

- Doppelklick auf leeren Slot: aktuellen Tab speichern und schliessen.
- Langer Druck auf Collection Switcher: vorherige Sammlung.
- Doppelklick auf Collection Switcher: neue Sammlung erstellen.
- Sammlung mit eigenem Icon/Farbe.
- Export/Import einzelner Sammlungen.
