# P2000 HA Dashboard

Een compacte **Home Assistant Lovelace-kaart** voor P2000-meldingen uit
[XMaarten/p2000-rtlsdr-mqtt](https://github.com/XMaarten/p2000-rtlsdr-mqtt).

Per melding toont de kaart duidelijke badges voor hulpdienst, regio, prioriteit,
GRIP-niveau en eventuele assistentie. Je ziet ook de lokale tijd, de originele
P2000-tekst, locatie en maximaal drie voertuigen/eenheden. Overige eenheden,
alarmeringsgroepen, monitorcodes en desgewenst capcodes vind je onder
**Details**. De kaart volgt het ingestelde Home Assistant-thema en werkt ook
op een smal dashboard.

> De kaart draait in **Home Assistant**; de P2000-receiver mag op een andere
> Raspberry Pi of Docker-host draaien. Home Assistant Supervisor is niet nodig
> voor de receiver.

## Installeren via HACS

1. Open **HACS** in Home Assistant.
2. Open het menu rechtsboven en kies **Custom repositories**.
3. Voeg `https://github.com/XMaarten/P2000-HA-Dashboard` toe als type **Dashboard**.
4. Zoek en installeer **P2000 HA Dashboard**.
5. Herlaad je browser of het Home Assistant-dashboard.

HACS beheert de JavaScript-resource normaal automatisch. Als de kaart na
installatie nog niet bekend is, controleer dan onder
**Instellingen → Dashboards → Resources** of de resource is toegevoegd.

## Handmatig installeren

Kopieer `p2000-messages-card.js` naar de Home Assistant-configuratiemap:

```text
/config/www/p2000-messages-card.js
```

Voeg in **Instellingen → Dashboards → Resources** een resource toe:

```text
/local/p2000-messages-card.js
```

Kies type **JavaScript-module**. Herlaad daarna de browser.

## Dashboardconfiguratie

De kaart verwacht het attribuut `messages` van een
`*_recente_meldingen`-sensor, zoals deze door
`p2000-rtlsdr-mqtt` via MQTT discovery wordt aangemaakt.
De onderstaande entity-id's zijn voorbeelden; controleer de exacte namen
onder **Ontwikkelaarstools → Statussen**.

### Alle meldingen

```yaml
type: custom:p2000-messages-card
entity: sensor.p2000_rtl_sdr_p2000_alle_meldingen_recente_meldingen
title: P2000 meldingen
max_messages: 10
show_units: true
show_groups: false
show_monitor_codes: false
show_capcodes: false
```

### GRIP

```yaml
type: custom:p2000-messages-card
entity: sensor.p2000_rtl_sdr_p2000_grip_recente_meldingen
title: Laatste GRIP-meldingen
max_messages: 10
show_units: true
show_groups: true
show_monitor_codes: true
show_capcodes: false
hide_when_empty: true
```

### Alkmaar

Configureer in je P2000-receiver eerst een route die de tekst
`*alkmaar*` filtert. Gebruik daarna de bijbehorende historie-sensor:

```yaml
type: custom:p2000-messages-card
entity: sensor.p2000_rtl_sdr_p2000_alkmaar_recente_meldingen
title: Meldingen Alkmaar
max_messages: 10
show_units: true
show_groups: true
show_monitor_codes: false
hide_when_empty: true
compact: true
```

## Opties

| Optie | Standaard | Betekenis |
| --- | --- | --- |
| `entity` | verplicht | Sensor met het `messages`-attribuut |
| `title` | P2000 meldingen | Titel van de kaart |
| `max_messages` | 10 | Maximum aantal getoonde berichten (1–100) |
| `show_units` | true | Toon maximaal drie eenheden direct en overige onder Details |
| `show_groups` | true | Toon alarmeringsgroepen onder Details |
| `show_monitor_codes` | true | Toon monitorcodes onder Details |
| `show_capcodes` | false | Toon capcodes onder Details |
| `hide_when_empty` | false | Toon geen kaart wanneer er geen meldingen zijn |
| `compact` | false | Kleinere tekst en minder tussenruimte |

De kaart gebruikt `services` (of `service`/`discipline` als fallback)
voor de hulpdienstbadges. Hij leidt geen extra hulpdiensten af uit woorden
in de meldtekst. Waar beschikbaar gebruikt hij de lokale `time`; anders
wordt de UTC-timestamp als Nederlandse tijd weergegeven. De originele
melding blijft ongewijzigd.

## Ontwikkeling

De repository heeft geen extra JavaScript-dependencies. Controleer de
syntax en voer de tests lokaal uit met Node.js:

```bash
node --check p2000-messages-card.js
node --test tests/*.test.mjs
```

De GitHub Action **Validate** voert beide controles bij een push of
pull request uit.

## Licentie

MIT. Zie [LICENSE](LICENSE).
