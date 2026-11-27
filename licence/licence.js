/* Short Stay Family — STL licence: the owner picks the certificates we arrange and pays (owners.shortstay.family/licence/)
   Static page: no owner data is stored in this repository. What's shown comes from the link the owner was emailed
   (#m=… or #z=…, which never reaches a server). The owner's ticks go to our Zapier catch hook, which checks the
   token against the menu the Suite saved in SharePoint and prices everything from THAT — editing the link changes
   nothing we act on. The hook raises one Xero invoice (Stripe Pay now) and leaves its payment link under the
   menu's private pay key, which this page waits for. */
(function () {
  "use strict";
  var BRANDS = {
    sssa: { n: "Short Stay St Andrews", img: "../img/brand-sssa.png" },
    efhh: { n: "East Fife Holiday Homes", img: "../img/brand-efhh.png" },
    stapc: { n: "St Andrews Property Co", img: "../img/brand-stapc.png" }
  };
  var HOOK_OK = /^https:\/\/hooks\.zapier\.com\/hooks\/catch\/\d+\/[A-Za-z0-9]+\/?$/;
  var UUID4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var PAY_OK = /^https:\/\/([a-z0-9-]+\.)*(xero\.com|stripe\.com)\//i;
  var STORE = "https://store.zapier.com/api/records?secret=";
  var LEGAL = "Short Stay Family, St Andrews Property Co and East Fife Holiday Homes are trading names of Short Stay St Andrews Ltd.";
  var app = document.getElementById("app");

  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
      else if (k === "checked") e.checked = !!v;
      else e.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) { if (c != null && c !== false) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function str(v, max) { return String(v == null ? "" : v).slice(0, max || 400); }
  function num(v) { var n = Number(v); return isFinite(n) && n >= 0 && n < 100000 ? n : 0; }
  function money(n) { return "£" + n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function price(n) { return "£" + (Math.round(n) === n ? n : n.toFixed(2)); }
  function longDate(iso) { var d = new Date(String(iso).slice(0, 10) + "T12:00:00"); return isNaN(d) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function b64u(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "=";
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function readHash() {
    var h = location.hash.replace(/^#/, ""), p = {};
    h.split("&").forEach(function (kv) { var i = kv.indexOf("="); if (i > 0) p[kv.slice(0, i)] = kv.slice(i + 1); else if (kv) p[kv] = ""; });
    if ("demo" in p) return Promise.resolve(DEMO);
    try {
      if (p.m) return Promise.resolve(JSON.parse(new TextDecoder().decode(b64u(p.m))));
      if (p.z) {
        if (typeof DecompressionStream === "undefined") return Promise.reject(new Error("old-browser"));
        var stream = new Blob([b64u(p.z)]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        return new Response(stream).text().then(JSON.parse);
      }
    } catch (e) { return Promise.reject(e); }
    return Promise.reject(new Error("no-menu"));
  }
  /* only what we expect, as plain text */
  function clean(m) {
    if (!m || m.v !== 1 || m.kind !== "licence" || !/^[A-Za-z0-9_-]{16,64}$/.test(String(m.t || ""))) throw new Error("bad-menu");
    var c = (Array.isArray(m.c) ? m.c : []).slice(0, 12).map(function (x) {
      return { i: str(x.i, 40), t: str(x.t, 120), w: str(x.w, 300), a: num(x.a), st: ["need", "ask", "ok"].indexOf(x.st) >= 0 ? x.st : "ask", d: str(x.d, 10), on: x.on !== false };
    }).filter(function (x) { return x.i && x.t; });
    return {
      t: m.t, demo: !!m.demo, h: HOOK_OK.test(String(m.h || "")) ? m.h : "", b: BRANDS[m.b] ? m.b : "sssa",
      p: str(m.p, 120), o: str(m.o, 60), kd: m.kd === "renewal" ? "renewal" : "new",
      pm: { n: str(m.pm && m.pm.n, 60) || "your property manager", ph: str(m.pm && m.pm.ph, 30) || "01334 845 845" },
      cf: m.cf == null ? null : num(m.cf), fee: num(m.fee), c: c, combo: m.combo && num(m.combo.a) ? { a: num(m.combo.a) } : null,
      x: str(m.x, 10), ps: UUID4.test(String(m.ps || "")) ? m.ps : ""
    };
  }

  var M = null, S = { on: {}, err: "" };
  function pmFirst() { return M.pm.n.split(" ")[0]; }
  function header() {
    var B = BRANDS[M.b];
    return el("div", { class: "top" }, [el("img", { src: B.img, alt: B.n }), el("span", { class: "eyebrow", text: M.kd === "renewal" ? "Licence renewal" : "Licence application" })]);
  }
  /* the lines to pay: our fee, the council fee, and every certificate that's needed or ticked
     (gas safety and legionella on one visit when both are wanted) */
  function lines() {
    var L = [], pick = M.c.filter(function (x) { return x.st === "need" || (x.st === "ask" && S.on[x.i]); }), ids = pick.map(function (x) { return x.i; });
    var both = M.combo && ids.indexOf("gas") >= 0 && ids.indexOf("legionella") >= 0;
    pick.forEach(function (x) {
      if (both && x.i === "legionella") return;
      if (both && x.i === "gas") { L.push({ t: "Gas safety + legionella risk assessment — one visit", a: M.combo.a, vat: true }); return; }
      L.push({ t: x.t, a: x.a, vat: true });
    });
    return { certs: L, ids: ids };
  }
  function sums() {
    var P = lines(), ex = M.fee + P.certs.reduce(function (s, l) { return s + l.a; }, 0), vat = Math.round(ex * 0.2 * 100) / 100, cf = M.cf || 0;
    return { P: P, ex: ex, vat: vat, cf: cf, total: Math.round((ex + vat + cf) * 100) / 100 };
  }
  function render() {
    var kids = [header()];
    kids.push(el("h1", { text: (M.o ? M.o + ", y" : "Y") + "our short-term let licence" }));
    kids.push(el("p", { text: "For " + M.p + ". Fife Council needs a set of safety certificates with the " + (M.kd === "renewal" ? "renewal" : "application") + ". We've ticked the certificates we don't have on file. Untick any you already hold a valid copy of (and email it to compliance@shortstay.family), or tick any you'd like us to arrange. Then pay, and we'll book the visits and make the application." }));
    var list = el("div", { class: "list" });
    M.c.forEach(function (x) {
      var right, box;
      if (x.st === "ok") right = el("span", { class: "tag", text: "✓ on file" + (x.d ? " to " + longDate(x.d) : "") });
      else right = el("span", { class: "amt", text: price(x.a) + " + VAT" });
      if (x.st === "ask") box = el("input", { type: "checkbox", id: "c-" + x.i, checked: !!S.on[x.i], onchange: function (e) { S.on[x.i] = e.target.checked; render(); } });
      else if (x.st === "need") box = el("input", { type: "checkbox", checked: true, disabled: true, "aria-label": "Needed" });
      else box = el("span", { "aria-hidden": "true", style: null, class: "okmark", text: "✓" });
      var why = x.st === "need" ? (x.w || "Needed — we don't have a valid one on file") : x.st === "ok" ? "We already have this — nothing to do" : (x.w || "Untick if you already have a valid one, and email us a copy.");
      list.appendChild(el("label", { class: "row", for: x.st === "ask" ? "c-" + x.i : null }, [box, el("span", { class: "txt" }, [x.t, el("span", { class: "why", text: why })]), right]));
    });
    kids.push(el("h2", { text: "Certificates" }));
    kids.push(list);
    if (M.combo) kids.push(el("p", { class: "small muted", text: "Gas safety and the legionella risk assessment are done on one visit when you need both — " + price(M.combo.a) + " + VAT together." }));
    var T = sums(), rows = [];
    T.P.certs.forEach(function (l) { rows.push(el("div", {}, [el("span", { text: l.t }), el("span", { text: money(l.a) })])); });
    rows.push(el("div", {}, [el("span", { text: M.kd === "renewal" ? "Our licence renewal fee" : "Our licence application fee" }), el("span", { text: money(M.fee) })]));
    rows.push(el("div", {}, [el("span", { text: "VAT at 20%" }), el("span", { text: money(T.vat) })]));
    if (M.cf) rows.push(el("div", {}, [el("span", { text: "Fife Council licence fee (passed on at cost, no VAT)" }), el("span", { text: money(M.cf) })]));
    rows.push(el("div", { class: "grand" }, [el("span", { text: "Total" }), el("span", { text: money(T.total) })]));
    kids.push(el("div", { class: "tot" }, rows));
    if (!M.cf) kids.push(el("p", { class: "small muted", text: "The council's own licence fee isn't included here — we'll let you know it separately." }));
    var btn = el("button", { class: "btn primary", type: "button", onclick: function () { send(btn); } }, ["Confirm and pay " + money(T.total)]);
    kids.push(btn);
    kids.push(el("p", { class: "small muted", text: "You'll pay by card or bank transfer on a secure Stripe page. No extra charge. We book the certificate visits as soon as it's paid." }));
    if (M.x && M.x < new Date().toISOString().slice(0, 10)) kids.push(el("p", { class: "err", text: "This link has expired — please reply to our email or call " + pmFirst() + " on " + M.pm.ph + " for a new one." }));
    if (S.err) kids.push(el("p", { class: "err", role: "alert", text: S.err }));
    kids.push(el("p", { class: "small muted", text: "Questions? Reply to the email or call " + pmFirst() + " on " + M.pm.ph + "." }));
    paint(kids);
  }
  function paint(kids) { kids.push(el("p", { class: "legal", text: LEGAL })); app.replaceChildren(el("div", { class: "card" }, kids)); }

  function send(btn) {
    var T = sums(), body = { v: 1, kind: "licence-choice", t: M.t, c: T.P.ids, shown: { ex: T.ex, vat: T.vat, cf: T.cf, total: T.total }, at: new Date().toISOString() };
    S.err = "";
    if (M.demo || !M.h) { paying(T, body.at, true); return; }
    btn.disabled = true; btn.textContent = "Sending…";
    var opts = { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify(body) };
    fetch(M.h, opts).then(function (r) { if (!r.ok) throw new Error("http " + r.status); })
      .catch(function () { return fetch(M.h, Object.assign({ mode: "no-cors" }, opts)); }) /* the hook is idempotent per token */
      .then(function () { store("ssf-lic-" + M.t, { c: T.P.ids, at: body.at, total: T.total }); paying(T, body.at, false); })
      .catch(function () { S.err = "Sorry, that didn't go through. Please check your connection and try again, or call " + pmFirst() + " on " + M.pm.ph + "."; render(); });
  }
  function paying(T, sentAt, demo) {
    var status = el("p", { text: "Setting up your secure payment for " + money(T.total) + "…" }), extra = el("div", { class: "done" });
    paint([header(), el("div", { class: "done" }, [el("div", { class: "spin", "aria-hidden": "true" }), el("h1", { text: "Thank you — one moment" }), status,
      el("p", { class: "small muted", text: "You'll pay by card or bank transfer on a secure Stripe payment page. No extra charge." }), extra])]);
    window.scrollTo(0, 0);
    var stop = function () { var sp = app.querySelector(".spin"); if (sp) sp.remove(); };
    if (demo) { setTimeout(function () { status.textContent = "This is where the secure payment page (Stripe) opens, ready to pay " + money(T.total) + "."; extra.appendChild(el("p", { class: "small muted", text: "(Preview — nothing was sent and nothing is charged.)" })); stop(); }, 1500); return; }
    var since = Date.parse(sentAt) - 120000, tries = 0;
    var fallback = function (why) {
      status.textContent = why || "We couldn't open the payment page just now, so we'll email you a secure payment link shortly. As soon as it's paid we'll book the certificate visits.";
      extra.appendChild(el("p", { class: "small muted" }, ["Your choices are saved. Questions? Call " + pmFirst() + " on " + M.pm.ph + "."])); stop();
    };
    if (!M.ps) return fallback();
    (function poll() {
      tries++;
      fetch(STORE + M.ps, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (d) {
        var p = d && d.pay;
        if (p && Date.parse(p.at || 0) >= since) {
          if (p.test) return fallback("Test link — no invoice is raised and nothing is charged.");
          if (p.failed) return fallback();
          if (p.url && PAY_OK.test(p.url)) {
            status.textContent = "Taking you to the secure payment page…";
            extra.appendChild(el("a", { class: "btn primary report", href: p.url, rel: "noopener" }, ["Pay " + money(+p.total || T.total) + " now"]));
            setTimeout(function () { location.assign(p.url); }, 600);
            return;
          }
        }
        if (tries < 45) setTimeout(poll, 2000); else fallback();
      }).catch(function () { if (tries < 45) setTimeout(poll, 2500); else fallback(); });
    })();
  }

  var DEMO = {
    v: 1, kind: "licence", t: "DEMO000000000000", demo: true, b: "sssa", p: "16 Woodside Crescent", o: "Alison", kd: "new",
    pm: { n: "Isla Horsburgh", ph: "01334 845 845" }, cf: 318, fee: 100,
    c: [
      { i: "gas", t: "Gas safety record", st: "ask", a: 110 },
      { i: "legionella", t: "Legionella risk assessment", st: "ask", a: 90 },
      { i: "eicr", t: "Electrical installation condition report (EICR)", st: "need", a: 235, w: "Needed — there isn't one on file" },
      { i: "pat", t: "Portable appliance test (PAT)", st: "ask", a: 70 },
      { i: "fra", t: "Fire risk assessment, alarms and fire safety kit", st: "need", a: 175, w: "Needed for every licence — includes the smoke, heat and CO alarms, blanket and extinguisher" },
      { i: "epc", t: "Energy Performance Certificate (EPC)", st: "ok", a: 115, d: "2031-03-12" }
    ],
    combo: { a: 175 }, x: "2026-12-31", ps: ""
  };

  readHash().then(function (m) { M = clean(m); var prev = store("ssf-lic-" + M.t); M.c.forEach(function (x) { if (x.st === "ask" && x.on) S.on[x.i] = true; }); if (prev && Array.isArray(prev.c)) { S.on = {}; prev.c.forEach(function (i) { S.on[i] = true; }); } document.title = "Your licence — " + M.p; render(); })
    .catch(function (e) {
      paint([el("h1", { text: "This link doesn't look right" }), el("p", { text: e && e.message === "old-browser" ? "Your browser is too old to open this link. Please try another browser, reply to our email, or call us on 01334 845 845." : "Please open the link from our email again, or call us on 01334 845 845." })]);
    });
})();
