/* Lets the existing pages call google.script.run.<fn>(...) when they are NOT served by Apps Script.
 * Each call becomes a cross-origin POST to the Apps Script web app (doPost in Code.gs). No cookies are sent. */
(function () {
  'use strict';
  var API = window.G5_API_URL;
  function post(fn, args) {
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // "simple" request: no CORS pre-flight
      body: JSON.stringify({ fn: fn, args: args }),
      redirect: 'follow', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store'
    }).then(function (r) { return r.json(); });
  }
  function make(ok, fail) {
    return new Proxy({}, { get: function (_, name) {
      if (name === 'withSuccessHandler') return function (f) { return make(f, fail); };
      if (name === 'withFailureHandler') return function (f) { return make(ok, f); };
      if (typeof name !== 'string') return undefined;
      return function () {
        var args = Array.prototype.slice.call(arguments);
        if (!API || !/^(https:\/\/|http:\/\/localhost)/.test(API)) { fail && fail(new Error('config.js has no API address')); return; }
        post(name, args).then(function (j) {
          if (j && j.error) fail && fail(new Error(j.error)); else ok && ok(j.result);
        }).catch(function (e) { fail && fail(e); });
      };
    } });
  }
  window.google = { script: { run: make(null, null) } };
})();
