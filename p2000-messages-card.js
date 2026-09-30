/* P2000 HA Dashboard — custom Lovelace card */
class P2000MessagesCard extends HTMLElement {
  static getStubConfig() {
    return { entity: "", title: "P2000 meldingen", max_messages: 10,
      show_units: true, show_groups: true, show_monitor_codes: true,
      show_capcodes: false, hide_when_empty: false, compact: false };
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._signature = null;
  }
  setConfig(config) {
    if (!config || typeof config.entity !== "string" || !config.entity.trim()) {
      throw new Error("P2000 Messages Card: 'entity' is verplicht.");
    }
    this._config = Object.assign({}, P2000MessagesCard.getStubConfig(), config);
    this._signature = null;
    this._render();
  }
  set hass(hass) {
    this._hass = hass;
    this._render();
  }
  getCardSize() {
    return Math.max(2, Math.min(12, this._messages().length * 2));
  }
  _messages() {
    const state = this._hass && this._config && this._hass.states[this._config.entity];
    const messages = state && state.attributes.messages;
    if (!Array.isArray(messages)) return [];
    const max = Math.max(1, Math.min(100, Number(this._config.max_messages) || 10));
    return messages.slice(0, max).filter(m => m && typeof m === "object");
  }
  _escape(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  _values(value) {
    if (Array.isArray(value)) return value.filter(v => v != null && v !== "");
    return value ? [value] : [];
  }
  _text(value) {
    if (typeof value !== "object" || value === null) return String(value);
    const fields = [value.service, value.station || value.location, value.callsign,
      value.unit_type_name || value.unit_type, value.description || value.remark];
    return [...new Set(fields.filter(Boolean))].join(" · ") || JSON.stringify(value);
  }
  _services(message) {
    const list = this._values(message.services);
    if (!list.length) list.push(...this._values(message.service || message.discipline));
    const values = list.flatMap(value => String(value).split(/[,/]+/))
      .map(value => value.trim()).filter(Boolean);
    return [...new Set(values.length ? values : ["P2000"])];
  }
  _serviceClass(service) {
    const value = String(service || "").toLowerCase();
    if (value.includes("brandweer")) return "fire";
    if (value.includes("ambulance") || value.includes("ghor")) return "medical";
    if (value.includes("politie")) return "police";
    if (value.includes("knrm") || value.includes("reddings")) return "rescue";
    return "generic";
  }
  _unitIcon(unit) {
    const value = this._text(unit).toLowerCase();
    if (/ambulance|\bambu\b/.test(value)) return "mdi:ambulance";
    if (/politie/.test(value)) return "mdi:police-badge";
    if (/knrm|redding/.test(value)) return "mdi:lifebuoy";
    if (/brandweer|tankautospuit|\bts[- ]/.test(value)) return "mdi:fire-truck";
    return "mdi:truck-outline";
  }
  _time(message) {
    if (message.time) {
      const time = String(message.time);
      const match = time.match(/(\d{2}:\d{2}(?::\d{2})?)/);
      return match ? match[1] : time;
    }
    const source = message.event_time_utc || message.received_at;
    if (!source) return "";
    const date = new Date(source);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("nl-NL", {
      timeZone: "Europe/Amsterdam", hour: "2-digit",
      minute: "2-digit", second: "2-digit"
    }).format(date);
  }
  _badge(label, kind) {
    return '<span class="badge ' + kind + '">' + this._escape(label) + '</span>';
  }
  _details(label, items) {
    if (!items.length) return "";
    return '<section class="detail-group"><strong>' + this._escape(label) +
      '</strong><ul>' + items.map(item => '<li>' + this._escape(this._text(item)) +
      '</li>').join("") + '</ul></section>';
  }
  _message(message) {
    const services = this._services(message);
    const priority = message.priority == null ? "" : String(message.priority);
    const region = this._values(message.region || message.regions).join(", ");
    const location = this._values(message.location || message.locations).join(", ");
    const assistance = this._values(message.assistance);
    const units = this._config.show_units ? this._values(message.units) : [];
    const groups = this._config.show_groups ? this._values(message.groups) : [];
    const monitorCodes = this._config.show_monitor_codes ?
      this._values(message.monitor_codes) : [];
    const capcodes = this._config.show_capcodes ?
      this._values(message.capcodes) : [];
    const displayedUnits = units.slice(0, 3);
    const extras = units.slice(3);
    const details = this._details("Overige eenheden", extras) +
      this._details("Groepen", groups) +
      this._details("Monitorcodes", monitorCodes) +
      this._details("Capcodes", capcodes);
    const badges = services.map(s => this._badge(s, this._serviceClass(s))).join("") +
      (region ? this._badge(region, "region") : "") +
      (priority ? this._badge("P" + priority, "priority p" + priority) : "") +
      (message.grip_level ? this._badge("GRIP " + message.grip_level, "grip") : "") +
      assistance.map(s => this._badge("Ass. " + s, "assist")).join("");
    const unitRows = displayedUnits.map(unit => '<div class="unit"><ha-icon icon="' +
      this._unitIcon(unit) + '"></ha-icon><span>' +
      this._escape(this._text(unit)) + '</span></div>').join("");
    return '<article class="message">' +
      '<div class="accent ' + this._serviceClass(services[0]) + '"></div>' +
      '<div class="top"><div class="badges">' + badges +
      '</div><time>' + this._escape(this._time(message)) + '</time></div>' +
      '<div class="body">' + this._escape(message.message || message.body || "") +
      '</div>' +
      (location ? '<div class="location"><ha-icon icon="mdi:map-marker-outline">' +
        '</ha-icon><span>' + this._escape(location) + '</span></div>' : "") +
      (unitRows ? '<div class="units">' + unitRows + '</div>' : "") +
      (details ? '<details><summary>Details' +
        (extras.length ? " · +" + extras.length + " eenheden" : "") +
        '</summary><div class="details-body">' + details + '</div></details>' : "") +
      '</article>';
  }
  _render() {
    if (!this._config || !this._hass) return;
    const messages = this._messages();
    const signature = JSON.stringify([this._config, messages]);
    if (signature === this._signature) return;
    this._signature = signature;
    if (this._config.hide_when_empty && !messages.length) {
      this.shadowRoot.innerHTML = "";
      return;
    }
    this.shadowRoot.innerHTML = '<style>' + P2000MessagesCard.styles +
      '</style><ha-card class="' + (this._config.compact ? "compact" : "") + '">' +
      '<div class="header">' + this._escape(this._config.title) + '</div>' +
      '<div class="messages">' +
      (messages.length ? messages.map(m => this._message(m)).join("") :
        '<div class="empty"><ha-icon icon="mdi:radio-tower"></ha-icon>' +
        '<span>Nog geen P2000-meldingen</span></div>') +
      '</div></ha-card>';
  }
}
P2000MessagesCard.styles = [
  ':host{display:block} ha-card{overflow:hidden}',
  '.header{padding:14px 15px 10px;font-size:1.2rem;font-weight:500;color:var(--primary-text-color)}',
  '.messages{padding:0 9px 9px}',
  '.message{position:relative;overflow:hidden;margin-bottom:8px;padding:11px 11px 11px 15px;',
  'border:1px solid var(--divider-color);border-radius:10px;',
  'background:var(--ha-card-background,var(--card-background-color))}',
  '.message:last-child{margin-bottom:0}',
  '.accent{position:absolute;top:0;bottom:0;left:0;width:3px;background:var(--divider-color)}',
  '.accent.fire{background:#e53935}.accent.medical{background:#f5a623}',
  '.accent.police{background:#1e88e5}.accent.rescue{background:#00a7a7}',
  '.top{display:flex;gap:8px;justify-content:space-between;align-items:flex-start}',
  '.badges{display:flex;flex-wrap:wrap;gap:5px;min-width:0}',
  '.badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:999px;',
  'font-size:.72rem;line-height:18px;background:var(--secondary-background-color);',
  'color:var(--primary-text-color)}',
  '.badge.fire{background:#e5393522;color:#ef5350}',
  '.badge.medical{background:#f5a62325;color:#eea32b}',
  '.badge.police{background:#1e88e525;color:#42a5f5}',
  '.badge.rescue{background:#00a7a725;color:#25baba}',
  '.badge.region{background:var(--secondary-background-color);color:var(--primary-text-color)}',
  '.badge.priority{background:#e5393522;color:#ef5350}',
  '.badge.p2{background:#f5a62325;color:#eea32b}',
  '.badge.p3{background:var(--secondary-background-color);color:var(--secondary-text-color)}',
  '.badge.grip,.badge.assist{background:#ff980025;color:#ffb74d}',
  'time{flex:0 0 auto;padding-top:2px;color:var(--secondary-text-color);',
  'font-size:.72rem;white-space:nowrap}',
  '.body{margin-top:8px;line-height:1.4;font-size:.92rem;color:var(--primary-text-color);',
  'overflow-wrap:anywhere}',
  '.location,.unit{display:flex;gap:5px;align-items:flex-start;',
  'color:var(--secondary-text-color);font-size:.8rem;line-height:1.35}',
  '.location{margin-top:7px}',
  '.location ha-icon,.unit ha-icon{--mdc-icon-size:16px;flex:0 0 auto}',
  '.units{display:grid;gap:5px;margin-top:9px}',
  'details{border-top:1px solid var(--divider-color);margin-top:9px;',
  'padding-top:7px;color:var(--secondary-text-color)}',
  'summary{cursor:pointer;font-size:.78rem}',
  '.details-body{display:grid;gap:9px;margin-top:8px;font-size:.78rem}',
  '.detail-group strong{color:var(--primary-text-color)}',
  '.detail-group ul{margin:4px 0 0;padding-left:19px}',
  '.detail-group li{margin:3px 0;overflow-wrap:anywhere}',
  '.empty{padding:16px;display:flex;gap:8px;align-items:center;',
  'color:var(--secondary-text-color)}',
  '.compact .header{padding-bottom:7px}',
  '.compact .message{padding-top:8px;padding-bottom:8px}',
  '.compact .body{margin-top:5px;font-size:.87rem}',
  '@media(max-width:460px){.header{padding-left:11px;padding-right:11px}',
  '.messages{padding-left:5px;padding-right:5px}.message{padding-right:8px}}'
].join("");
if (!customElements.get("p2000-messages-card")) {
  customElements.define("p2000-messages-card", P2000MessagesCard);
}
window.customCards = window.customCards || [];
if (!window.customCards.some(card => card.type === "p2000-messages-card")) {
  window.customCards.push({
    type: "p2000-messages-card", name: "P2000 Messages Card",
    description: "Compacte kaart voor recente P2000-meldingen", preview: true
  });
}
console.info("%c P2000 Messages Card %c v1.0.0 ",
  "color:white;background:#1976d2;font-weight:bold",
  "color:#1976d2;background:white;font-weight:bold");
