import test from "node:test";
import assert from "node:assert/strict";

globalThis.HTMLElement = class {
  constructor() {
    this.style = { display: "" };
  }
  attachShadow() {
    this.shadowRoot = { innerHTML: "" };
  }
};

const registry = new Map();
globalThis.customElements = {
  get: (name) => registry.get(name),
  define: (name, constructor) => registry.set(name, constructor)
};
globalThis.window = globalThis;
await import("../p2000-messages-card.js");

const P2000Card = registry.get("p2000-messages-card");

function render(messages, overrides = {}) {
  const card = new P2000Card();
  card._now = () => Date.parse("2026-08-26T12:00:00+02:00");
  card.setConfig({ entity: "sensor.p2000_history", ...overrides });
  card.hass = {
    states: {
      "sensor.p2000_history": {
        state: String(messages.length),
        attributes: { messages }
      }
    }
  };
  return card.shadowRoot.innerHTML;
}

test("shows only actual services and keeps assistance separate", () => {
  const html = render([{
    message: "Ass. Politie: landelijke groepsoproep KNRM-KWC",
    services: ["Brandweer"],
    assistance: ["Politie"],
    region: "Noord- en Oost-Gelderland",
    priority: 2,
    grip_level: 1,
    time: "2026-08-26 11:38:17",
    event_time_utc: "2026-08-26T09:38:17Z",
    units: ["TS-3531"],
    groups: ["Bevelvoerders Verzorgingsgroep"],
    monitor_codes: ["Monitorcode Oost"]
  }]);
  assert.match(html, /badge fire">Brandweer/);
  assert.doesNotMatch(html, /badge rescue">KNRM/);
  assert.match(html, /Ass\. Politie/);
  assert.match(html, /GRIP 1/);
  assert.match(html, /11:38:17/);
  assert.match(html, /TS-3531/);
  assert.match(html, /Bevelvoerders Verzorgingsgroep/);
  assert.match(html, /Monitorcode Oost/);
});

test("uses Dutch local time and escapes untrusted message content", () => {
  const html = render([{
    message: "<script>alert('x')</script>",
    service: "Ambulance",
    event_time_utc: "2026-08-26T09:38:17+00:00",
    capcodes: ["000001234"]
  }], { show_capcodes: true });
  assert.match(html, /11:38:17/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /000001234/);
});

test("handles empty history and hide_when_empty", () => {
  assert.equal(render([]), "");
  assert.match(render([], { hide_when_empty: false }), /Nog geen P2000-meldingen/);
});

test("shows first three units and puts remaining units in details", () => {
  const html = render([{
    message: "P 1 Test",
    event_time_utc: "2026-08-26T09:45:00Z",
    units: ["TS-1", "TS-2", "TS-3", "TS-4"]
  }]);
  assert.match(html, /TS-1/);
  assert.match(html, /Overige eenheden/);
  assert.match(html, /TS-4/);
});

test("only shows messages from the last 10 hours and filters before limiting", () => {
  const html = render([
    { message: "Old report", event_time_utc: "2026-08-25T20:00:00Z" },
    { message: "Recent report", event_time_utc: "2026-08-26T09:30:00Z" }
  ], { max_messages: 1 });
  assert.match(html, /Recent report/);
  assert.doesNotMatch(html, /Old report/);
});

test("hides itself when the last message expires without new MQTT data", () => {
  const card = new P2000Card();
  let now = Date.parse("2026-08-26T12:00:00+02:00");
  card._now = () => now;
  card.setConfig({ entity: "sensor.p2000_history" });
  card.hass = {
    states: { "sensor.p2000_history": {
      attributes: { messages: [
        { message: "Recent report", event_time_utc: "2026-08-26T09:30:00Z" }
      ] }
    } }
  };
  assert.match(card.shadowRoot.innerHTML, /Recent report/);
  now += 11 * 60 * 60 * 1000;
  card._render();
  assert.equal(card.shadowRoot.innerHTML, "");
  assert.equal(card.style.display, "none");
  assert.equal(card.getCardSize(), 0);
});

test("ignores messages without a usable date", () => {
  assert.equal(render([{ message: "Unknown date", time: "11:38:17" }]), "");
});
