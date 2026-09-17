# Ideen und Backlog

Diese Datei sammelt Ideen aus dem Chat, ohne sie schon als beschlossenes Verhalten zu behandeln.

## Idee 1: Doppelklick speichert aktuellen Tab und schliesst ihn

Status:

- Umgesetzt fuer leere Slots.
- Ein einzelner Klick speichert weiter den aktiven Tab.
- Ein Doppelklick speichert den aktiven Tab und schliesst danach nur dann den Browser-Tab, wenn dessen URL noch zur gespeicherten URL passt.
- Belegte Slots behalten ihr bisheriges Verhalten.

Motivation:

Carlos hat oft viele Browser-Tabs offen.
Ein Doppelklick auf einen leeren oder speziellen Slot koennte den aktuellen Tab speichern und direkt schliessen.

Moegliches Verhalten:

- Doppelklick auf leeren Slot:
  - aktive Chrome-/Safari-URL und Tab-Titel speichern
  - Favicon laden
  - Button aktualisieren
  - gespeicherten Browser-Tab schliessen
- Doppelklick auf belegten Slot:
  - noch offen zu klaeren

Offene Produktfragen:

- Soll Doppelklick nur bei leeren Slots wirken?
- Was passiert bei belegten Slots?
- Soll Schliessen rueckgaengig machbar sein?
- Reicht ein `showAlert`, wenn kein unterstuetzter Browser gelesen werden kann?

Technische Notizen:

- Stream Deck liefert KeyDown/KeyUp, aber keine direkte Double-Click-API.
- Doppelklick muss selbst ueber Zeitfenster erkannt werden.
- Konflikt mit normalem kurzem Druck beachten:
  - Wenn erster Klick sofort speichert/oeffnet, ist es fuer Doppelklick zu spaet.
  - Fuer Doppelklick muss kurzer Druck evtl. um ca. 250-350 ms verzoegert werden.
- Tab-Schliessen per AppleScript ist moeglich, aber riskanter als nur Speichern.

Technischer Ansatz:

- Double-Click-Zeitfenster: 300 ms.
- Nur leere Slots duerfen per Doppelklick speichern und schliessen.
- Der normale Einzelklick auf leere Slots wird deshalb um 300 ms verzoegert.

## Idee 2: Recherche-Sammlungen / Ordner

Motivation:

Carlos nutzt einen Stream-Deck-Ordner mit 14 Bookmark-Slots plus Zurueck-Taste.
Gewuenscht ist ein schneller Weg, neue thematische Sammlungen wie `Recherche XYZ` anzulegen.

Moegliche Interpretation:

- Eine Taste legt eine neue Sammlung an.
- Sammlung enthaelt wieder mehrere Slots.
- Ziel: geordnet Links zu einem Thema ablegen.

Wichtige technische Unsicherheit:

- Es ist noch nicht geprueft, ob ein Stream-Deck-Plugin wirklich automatisch Stream-Deck-Ordner/Profile/Seiten anlegen oder veraendern darf.
- Das Stream-Deck-SDK kann Actions steuern, aber UI-Strukturen wie Ordner sind vermutlich nur eingeschraenkt oder gar nicht programmatisch anlegbar.

Moegliche Alternativen, falls echte Stream-Deck-Ordner nicht gehen:

1. **Sammlungsmodus im Plugin**
   - Jede Taste hat `collectionId` + `slot`.
   - Eine Taste kann zwischen Sammlungen wechseln.
   - Stream Deck bleibt auf derselben Seite, aber Slotinhalte wechseln.

2. **Profil-/Seiten-Template manuell duplizieren**
   - Plugin verwaltet Daten.
   - Nutzer dupliziert Stream-Deck-Ordner manuell.
   - Tasten zeigen je nach eingestellter Sammlung andere Slots.

3. **Sammlungs-Navigation ueber Plugin-Tasten**
   - Taste `Naechste Sammlung`.
   - Taste `Vorherige Sammlung`.
   - Slots 1-14 zeigen immer die aktuelle Sammlung.

Offene Produktfragen:

- Soll eine Sammlung einen Namen bekommen, z. B. `Koreanisch`, `Steuern`, `Recherche XYZ`?
- Wie viele Slots pro Sammlung?
- Soll Sammlung direkt auf dem Button sichtbar sein?
- Soll es eine globale Startseite fuer Sammlungen geben?

Empfohlener naechster Schritt:

- Sammlungsmodus im Plugin planen.
- Detaillierte Anforderungen liegen in `docs/collection-mode-requirements.md`.
- Echte Stream-Deck-Ordner erst danach separat auf SDK-Machbarkeit pruefen.

## Idee 3: Safari-Unterstuetzung

Status:

- Gebaut fuer den normalen Slot-Pfad.
- Der gespeicherte Browser bleibt pro Slot erhalten (`chrome` oder `safari`).

Warum Safari unterstuetzt ist und Firefox nicht geplant ist:

- Safari ist auf macOS per AppleScript besser steuerbar als Firefox.

Offene Fragen:

- Soll es spaeter eine sichtbare Browser-Anzeige im Einstellungsbereich geben?

## Idee 4: bessere Titel

Aktuell:

- erste 14 Zeichen des Tab-Titels
- 7 oben, 7 unten

Moegliche Verbesserungen:

- kuerzere manuelle Titel schneller editieren
- automatische sinnvolle Kuerzung
- Domain optional klein anzeigen
- Sammlungstitel oder Slotnummer optional anzeigen

## Idee 5: YouTube-Links in Firefox oeffnen

Status:

- Umgesetzt als globale Option im Einstellungsbereich.
- Wenn `YouTube in Firefox oeffnen` aktiv ist, werden `youtube.com`, Subdomains von `youtube.com` und `youtu.be` in Firefox geoeffnet.
- Fake-Domains wie `youtube.com.example` werden nicht als YouTube erkannt.

Motivation:

YouTube soll optional in Firefox laufen, auch wenn der Link urspruenglich aus Chrome oder Safari gespeichert wurde.

Moegliches Verhalten:

- Beim Oeffnen eines belegten Slots prueft das Plugin die URL.
- URLs von `youtube.com` und `youtu.be` werden in Firefox geoeffnet.
- Andere URLs nutzen weiter den gespeicherten Browser (`chrome` oder `safari`).

Wichtige Einschraenkung:

- Firefox kann auf macOS nicht so zuverlaessig per AppleScript gelesen und durchsucht werden wie Chrome oder Safari.
- Deshalb oeffnet Firefox v1 nur die URL. Vorhandene Firefox-Tabs werden nicht gesucht oder fokussiert.

Technische Notizen:

- Routing-Regel sollte zentral im Browser-Router liegen, nicht direkt in der Tastenlogik.
- Die gespeicherte Bookmark-Datei wurde fuer `browser: "firefox"` erweitert, weil Firefox auch als Speicherquelle moeglich ist.

## Idee 6: Firefox spaeter als Speicherquelle

Status:

- Umgesetzt als bewusste Spezialunterstuetzung.
- Wenn Firefox im Vordergrund ist, kopiert das Plugin automatisch die Adresszeile per `Cmd+L`, `Cmd+C`.
- Danach wird nur eine gueltige `http`- oder `https`-URL gespeichert.
- Die vorherige Text-Zwischenablage wird wiederhergestellt.

Motivation:

Firefox soll eventuell spaeter ebenfalls zum Speichern neuer Slots nutzbar sein.

Einschraenkungen:

- Firefox bietet auf macOS offenbar keine robuste AppleScript-Schnittstelle fuer aktiven Tab, URL und Titel.
- Ein gleichwertiges Verhalten zu Chrome/Safari ist deshalb nicht gebaut.
- Firefox-Titel werden nicht zuverlaessig gelesen; als Titel wird erstmal die URL gespeichert.
- Vorhandene Firefox-Tabs werden beim Oeffnen nicht gesucht oder fokussiert.
- Firefox-Tabs werden bei Doppelklick nicht automatisch geschlossen.
- Fuer `Cmd+L`, `Cmd+C` braucht Stream Deck bzw. das Plugin macOS-Bedienungshilfen-Rechte.
- Text-Zwischenablage wird wiederhergestellt; Bilder, Dateien oder formatierte Zwischenablage-Inhalte koennen per AppleScript nicht perfekt garantiert werden.
- Wenn keine gueltige URL in der Zwischenablage liegt, wird nichts gespeichert und `showAlert` angezeigt.

## Idee 7: Daten-Export und Backup

Status:

- Umgesetzt.
- `Backup erstellen` schreibt `bookmarks.backup-<timestamp>.json` in den Plugin-Datenordner.
- `Export in Downloads` schreibt `bookmarks.export-<timestamp>.json` in den macOS-Downloads-Ordner.
- `Import auswaehlen` ersetzt alle gespeicherten Links durch eine ausgewaehlte JSON-Datei.
- Import legt vorher automatisch ein Backup an.
- Ungueltige Import-Dateien werden abgelehnt und ersetzen die bestehenden Daten nicht.

Aktuell:

- JSON liegt gut lesbar unter `~/.streamdeck-bookmarks/bookmarks.json`.
- Korrupte Top-Level-Dateien werden automatisch gesichert.
