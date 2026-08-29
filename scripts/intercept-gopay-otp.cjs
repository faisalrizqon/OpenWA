/**
 * Interceptor: patch http/https agar setiap request login.js tercatat
 * (URL, headers, body) tanpa benar-benar mengirim data. Dipakai via:
 *   node -r ./scripts/intercept-gopay-otp.cjs login.js
 * Input nomor HP dipasok via stdin (pipe).
 */
const http = require("http");
const https = require("https");

function wrap(mod, name) {
  const origRequest = mod.request;
  mod.request = function (options, ...rest) {
    try {
      let url = "";
      let method = "";
      let headers = {};
      if (typeof options === "string") {
        url = options;
        method = (rest[0] && rest[0].method) || "";
        headers = (rest[0] && rest[0].headers) || {};
      } else if (options instanceof URL) {
        url = options.href;
        method = (rest[0] && rest[0].method) || options.method || "";
        headers = (rest[0] && rest[0].headers) || {};
      } else if (options && typeof options === "object") {
        const host = options.hostname || options.host || "";
        const port = options.port ? `:${options.port}` : "";
        url = `https://${host}${port}${options.path || ""}`;
        method = options.method || "";
        headers = options.headers || {};
      }
      console.error(`[INTERCEPT ${name}] ${method} ${url}`);
      console.error(`[INTERCEPT ${name}] headers: ${JSON.stringify(headers)}`);
    } catch (err) {
      console.error(`[INTERCEPT] log error: ${err}`);
    }
    // Kembalikan fake request object agar proses berhenti di sini
    const { Writable } = require("stream");
    const fake = new Writable();
    fake.setHeader = () => {};
    fake.getHeader = () => undefined;
    fake.setTimeout = () => fake;
    fake.on = function (ev, cb) {
      if (ev === "error" || ev === "response") return this;
      return Writable.prototype.on.call(this, ev, cb);
    };
    fake.end = function () {
      console.error(`[INTERCEPT ${name}] body: ${this._body || ""}`);
      console.error(`[INTERCEPT] selesai — request tidak dikirim`);
      process.exit(0);
    };
    fake.write = function (chunk) {
      this._body = (this._body || "") + chunk;
      return true;
    };
    fake.destroy = () => {};
    return fake;
  };
}

wrap(http, "http");
wrap(https, "https");
console.error("[INTERCEPT] interceptor aktif");
