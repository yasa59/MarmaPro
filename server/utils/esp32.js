// server/utils/esp32.js
const fetch = require('node-fetch');

const base = process.env.ESP32_BASE_URL || 'http://192.168.4.1';

async function esp32Get(path) {
  const r = await fetch(`${base}${path}`);
  const txt = await r.text();
  try { return { ok: r.ok, json: JSON.parse(txt) }; }
  catch { return { ok: r.ok, txt }; }
}

async function esp32Post(path) {
  // ESP32 handlers in your sketch use query params; we still issue GETs for simplicity.
  return esp32Get(path);
}

module.exports = {
  startMotor: async (m, sec) => esp32Post(`/motor/start?m=${m}&sec=${sec}`),
  stopMotor:  async (m)       => esp32Post(`/motor/stop?m=${m}`),
  stopAll:    async ()        => esp32Post(`/motor/stop-all`),
  status:     async ()        => esp32Get(`/status`),
};
