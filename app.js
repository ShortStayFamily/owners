/* Short Stay Family — owner's choice page for condition reports (owners.shortstay.family)
   Static page: no owner data is stored in this repository. Everything shown comes from the link the
   owner was emailed (#m=… or #z=… in the address, which never reaches any server). The owner's ticks
   are posted to our Zapier catch hook, which checks the token against the menu the Suite saved in
   SharePoint and uses those stored prices — so editing the link changes nothing we act on. */
(function () {
  "use strict";
  var BRANDS = {
    sssa: { n: "Short Stay St Andrews", img: "img/brand-sssa.png" },
    efhh: { n: "East Fife Holiday Homes", img: "img/brand-efhh.png" },
    stapc: { n: "St Andrews Property Co", img: "img/brand-stapc.png" }
  };
  var HOOK_OK = /^https:\/\/hooks\.zapier\.com\/hooks\/catch\/\d+\/[A-Za-z0-9]+\/?$/;
  var LEGAL = "Short Stay Family, St Andrews Property Co and East Fife Holiday Homes are trading names of Short Stay St Andrews Ltd.";
  var app = document.getElementById("app");

  /* ---------- tiny DOM helper (text only — never innerHTML with link data) ---------- */
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
  function svg(path) {
    var ns = "http://www.w3.org/2000/svg", s = document.createElementNS(ns, "svg");
    s.setAttribute("width", "16"); s.setAttribute("height", "16"); s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "2");
    s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); s.setAttribute("aria-hidden", "true");
    path.forEach(function (d) { var p = document.createElementNS(ns, d[0]); Object.keys(d[1]).forEach(function (k) { p.setAttribute(k, d[1][k]); }); s.appendChild(p); });
    return s;
  }
  var CAL = [["rect", { x: "3", y: "5", width: "18", height: "16", rx: "2" }], ["path", { d: "M16 3v4M8 3v4M3 10h18" }]];
  function safeUrl(u) { return typeof u === "string" && /^https:\/\/[^\s"<>]+$/i.test(u) ? u : ""; }
  function str(v, max) { return String(v == null ? "" : v).slice(0, max || 400); }
  function num(v) { var n = Number(v); return isFinite(n) && n >= 0 && n < 100000 ? n : 0; }
  function money(n) { return "£" + n.toFixed(2); }
  function price(n) { return "£" + (Math.round(n) === n ? n : n.toFixed(2)); }
  function longDate(iso) { var d = new Date(String(iso).slice(0, 10) + "T12:00:00"); return isNaN(d) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }

  /* ---------- read the menu from the link ---------- */
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
  function clean(m) {
    if (!m || m.v !== 1 || !/^[A-Za-z0-9_-]{16,64}$/.test(m.t || "")) throw new Error("bad-menu");
    var pm = m.pm || {};
    function item(x) { return { i: str(x.i, 40), t: str(x.t, 160), w: str(x.w, 400), a: num(x.a), on: !!x.on }; }
    return {
      t: m.t, h: HOOK_OK.test(m.h || "") ? m.h : "", demo: !!m.demo,
      b: BRANDS[m.b] ? m.b : "sssa", p: str(m.p, 120), d: str(m.d, 10), r: safeUrl(m.r), o: str(m.o, 60),
      pm: { n: str(pm.n, 60) || "your property manager", ph: str(pm.ph, 30) || "01334 845 845", bk: safeUrl(pm.bk) },
      s: (m.s || []).slice(0, 20).map(item).filter(function (x) { return x.i && x.t; }),
      y: (m.y || []).slice(0, 6).map(item).filter(function (x) { return x.i && x.t; }),
      q: (m.q || []).slice(0, 12).map(function (x) {
        return { i: str(x.i, 40), t: str(x.t, 160), w: str(x.w, 400), rv: str(x.rv, 240), rf: str(x.rf, 120), lk: safeUrl(x.lk), lt: str(x.lt, 120), on: !!x.on, ph: (x.ph || []).slice(0, 3).map(function (s) { return str(s, 40); }) };
      }).filter(function (x) { return x.i && x.t; }),
      inc: m.inc == null ? null : num(m.inc), fr: m.fr > 0 && m.fr < 0.5 ? Number(m.fr) : 0.1,
      x: str(m.x, 10), yn: m.yn ? str(m.yn, 200) : ""
    };
  }

  /* ---------- state ---------- */
  var M, S;
  function pmFirst() { return M.pm.n.split(/\s+/)[0]; }
  function sums() {
    var ticked = M.s.filter(function (j) { return S.s[j.i]; }).concat(M.y.filter(function (j) { return S.y[j.i]; }));
    var sub = ticked.reduce(function (a, j) { return a + j.a; }, 0);
    var fee = Math.round(sub * M.fr * 1.2 * 100) / 100;          /* our arrangement fee: 10% + VAT */
    var total = Math.round((sub + fee) * 100) / 100;
    var short = M.inc == null ? false : total > M.inc;
    var card = total > 0 && (short || S.pay === "card");
    var qs = M.q.filter(function (q) { return S.q[q.i]; });
    return { n: ticked.length, sub: sub, fee: fee, total: total, short: short, card: card, qs: qs };
  }

  /* ---------- render ---------- */
  function header() {
    var B = BRANDS[M.b];
    return el("div", { class: "top" }, [
      el("div", { class: "eyebrow", text: B.n + (M.d ? " · condition report " + longDate(M.d) : " · condition report") }),
      el("img", { src: B.img, alt: B.n })
    ]);
  }
  function itemRow(j, group) {
    return el("label", { class: "row" }, [
      el("input", { type: "checkbox", checked: S[group][j.i], onchange: function (e) { S[group][j.i] = e.target.checked; render(); } }),
      el("span", { class: "txt" }, [el("b", { text: j.t }), j.w ? el("span", { class: "why", text: j.w }) : null]),
      el("span", { class: "amt", text: price(j.a) })
    ]);
  }
  function quoteRow(q) {
    var ev = [];
    if (q.rv) ev.push(el("blockquote", null, [el("q", { text: q.rv }), q.rf ? el("br") : null, q.rf ? document.createTextNode(q.rf) : null]));
    return el("div", { class: "qrow" }, [
      el("label", { class: "row" }, [
        el("input", { type: "checkbox", checked: S.q[q.i], onchange: function (e) { S.q[q.i] = e.target.checked; render(); } }),
        el("span", { class: "txt" }, [el("b", { text: q.t }), q.w ? el("span", { class: "why", text: q.w }) : null]),
        el("span", { class: "tag", text: "Yes, get quotes" })
      ]),
      ev.length ? el("div", { class: "ev" }, ev) : null,
      q.lk ? el("a", { href: q.lk, target: "_blank", rel: "noopener noreferrer", text: q.lt || "See this in the full report" }) : (q.lt ? el("span", { class: "xs muted indent", text: q.lt }) : null)
    ]);
  }
  function render() {
    var T = sums(), kids = [header()];
    var expired = M.x && M.x < new Date().toISOString().slice(0, 10);
    kids.push(el("h1", { text: (M.p ? M.p + " — " : "") + "choose the work you'd like us to do" }));
    kids.push(el("p", { class: "muted small" }, [
      (M.o ? "Hello " + M.o + ". " : "") + "Tick what you'd like and we'll take care of it. Nothing goes ahead until you approve. ",
      M.r ? el("a", { href: M.r, target: "_blank", rel: "noopener noreferrer", text: "View the full report" }) : null
    ]));
    if (expired) {
      kids.push(el("div", { class: "note", text: "This menu has expired. Please reply to our email or call " + pmFirst() + " on " + M.pm.ph + " and we'll send you an up-to-date one." }));
      return paint(kids);
    }
    if (M.s.length) {
      kids.push(el("h2", { text: "Small jobs, priced" }));
      kids.push(el("p", { class: "small muted", text: "Carried out internally. Prices include VAT." }));
      kids.push(el("div", { class: "list" }, M.s.map(function (j) { return itemRow(j, "s"); })));
      kids.push(el("label", { class: "auto" }, [
        el("input", { type: "checkbox", checked: S.auto, onchange: function (e) { S.auto = e.target.checked; } }),
        el("span", { text: "Tick here if you would like us just to arrange these small jobs without seeking your permission" })
      ]));
    }
    if (M.y.length) {
      kids.push(el("h2", { text: "Recommended every year" }));
      kids.push(el("p", { class: "small muted", text: M.yn || "Carried out by our specialist contractor. Prices include VAT." }));
      kids.push(el("div", { class: "list" }, M.y.map(function (j) { return itemRow(j, "y"); })));
    }
    if (M.q.length) {
      kids.push(el("h2", { text: "Bigger work — shall we get quotes?" }));
      kids.push(el("p", { class: "small muted", text: "Over £100 + VAT, or needing a contractor to visit. We'll only arrange quotes for the ones you tick, then come back to you with the prices to approve. Getting quotes costs you nothing. Photos and comments are in the full report." }));
      kids.push(el("div", { class: "list" }, M.q.map(quoteRow)));
    }
    kids.push(el("div", { class: "tot" }, [
      el("div", null, [el("span", { text: "Selected Work (" + T.n + ")" }), el("span", { text: money(T.sub) })]),
      el("div", { class: "muted" }, [el("span", { text: "Our arrangement fee — 10% + VAT" }), el("span", { text: money(T.fee) })]),
      el("div", { class: "grand" }, [el("span", { text: "Total" }), el("span", { text: money(T.total) })]),
      el("div", { class: "small muted", text: T.qs.length ? "We’ll also get quotes for: " + T.qs.map(function (q) { return q.t.replace(/^an? /i, "").toLowerCase(); }).join(", ") + "." : "No quotes asked for." })
    ]));
    if (T.total > 0) {
      kids.push(el("h2", { text: "How you'd like to pay" }));
      if (T.short) {
        kids.push(el("div", { class: "note", text: "The distributable funds due to you before the work (" + price(M.inc) + ") won't quite cover this, so on this occasion we'll ask for payment before we go ahead. Once you approve, we'll email you a secure payment link (Stripe), where you can pay by card or bank transfer at no extra charge. As soon as it's through, we'll book the work and confirm the dates." }));
      } else {
        var incTxt = M.inc == null ? "It comes off your next owner statement." : "It comes off your next owner statement. Income due to you before the work: " + price(M.inc) + ".";
        kids.push(el("div", { class: "pay" }, [
          el("label", { class: "opt" + (!T.card ? " on" : "") }, [
            el("input", { type: "radio", name: "pay", checked: !T.card, onchange: function () { S.pay = "income"; render(); } }),
            el("span", null, [el("b", { text: "Take it from my rental income" }), el("span", { class: "why", text: incTxt })])
          ]),
          el("label", { class: "opt" + (T.card ? " on" : "") }, [
            el("input", { type: "radio", name: "pay", checked: T.card, onchange: function () { S.pay = "card"; render(); } }),
            el("span", null, [el("b", { text: "Pay now by card or bank transfer" }), el("span", { class: "why", text: "We'll email you a secure payment link (Stripe), no extra charge." })])
          ])
        ]));
      }
    }
    var label = "Approve " + money(T.total);
    if (T.n === 0) label = T.qs.length ? "Send my choices" : "Nothing for now";
    else if (T.card) label = "Approve & pay " + money(T.total);
    var book = M.pm.bk
      ? el("a", { class: "btn", href: M.pm.bk, target: "_blank", rel: "noopener noreferrer", title: "Book a call with " + pmFirst() }, [svg(CAL), "Book a call with " + pmFirst()])
      : el("a", { class: "btn", href: "tel:" + M.pm.ph.replace(/[^\d+]/g, "") }, ["Call " + pmFirst()]);
    kids.push(el("div", { class: "btns" }, [
      el("button", { type: "button", class: "btn primary", onclick: function (e) { send("approve", e.currentTarget); } }, [label]),
      el("button", { type: "button", class: "btn", onclick: function (e) { send("call", e.currentTarget); } }, ["Call me first"]),
      book
    ]));
    if (S.err) kids.push(el("p", { class: "err", role: "alert", text: S.err }));
    kids.push(el("p", { class: "small muted", text: "Anything you don't tick stays on our list for next year's report. Questions? Reply to the email or call " + pmFirst() + " on " + M.pm.ph + "." }));
    paint(kids);
  }
  function paint(kids) {
    kids.push(el("p", { class: "legal", text: LEGAL }));
    var card = el("div", { class: "card" }, kids);
    app.replaceChildren(card);
  }

  /* ---------- send the owner's choices ---------- */
  function ids(o) { return Object.keys(o).filter(function (k) { return o[k]; }); }
  function send(act, btn) {
    var T = sums();
    var body = {
      v: 1, t: M.t, act: act,
      s: ids(S.s), y: ids(S.y), q: ids(S.q),
      pay: T.total > 0 ? (T.card ? "card" : "income") : "none", auto: !!S.auto,
      shown: { sub: T.sub, fee: T.fee, total: T.total },
      at: new Date().toISOString()
    };
    S.err = "";
    if (M.demo || !M.h) { done(act, T, true); return; }
    btn.disabled = true; btn.textContent = "Sending…";
    var opts = { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify(body) };
    fetch(M.h, opts).then(function (r) { if (!r.ok) throw new Error("http " + r.status); })
      .catch(function () { return fetch(M.h, Object.assign({ mode: "no-cors" }, opts)); }) /* the hook is idempotent per token */
      .then(function () { store("ssf-sent-" + M.t, { act: act, at: body.at, total: T.total, card: T.card }); done(act, T, false); })
      .catch(function () { S.err = "Sorry, that didn't go through. Please check your connection and try again, or call " + pmFirst() + " on " + M.pm.ph + "."; render(); });
  }
  function done(act, T, demo) {
    var first = pmFirst(), lines = [];
    if (act === "call") lines.push("Thanks — " + first + " will give you a call to talk it through. Nothing goes ahead until you've decided.");
    else if (T.n === 0 && !T.qs.length) lines.push("Thanks for letting us know. We'll keep these on our list for next year's report.");
    else {
      if (T.n) lines.push(T.card
        ? "Thank you. We'll email you a secure payment link (Stripe) for " + money(T.total) + " shortly. As soon as it's paid we'll book the work and confirm the dates."
        : "Thank you. We'll book the work and confirm the dates. The " + money(T.total) + " will come off your next owner statement.");
      if (T.qs.length) lines.push("We'll arrange quotes for the " + (T.qs.length === 1 ? "bigger job" : T.qs.length + " bigger jobs") + " you ticked and come back to you with the prices.");
    }
    var kids = [header(), el("div", { class: "done" }, [
      el("div", { class: "tick" }, [svg([["path", { d: "M5 12l5 5 9-10", stroke: "#fff" }]])]),
      el("h1", { text: act === "call" ? "We'll call you" : "Thank you — we've got your choices" })
    ].concat(lines.map(function (l) { return el("p", { text: l }); })).concat([
      demo ? el("p", { class: "small muted", text: "(Preview — nothing was sent.)" }) : null,
      el("p", { class: "small muted" }, ["Changed your mind? ", el("a", { href: "#", onclick: function (e) { e.preventDefault(); render(); }, text: "Change my choices" }), " — or reply to our email."])
    ]))];
    paint(kids);
    window.scrollTo(0, 0);
  }

  /* preview data for #demo (the board on the design canvas) */
  var DEMO = {
    v: 1, t: "DEMO000000000000", demo: true, b: "efhh", p: "3 Rose Wynd", d: "2026-11-21", o: "Alison",
    pm: { n: "Niamh Mckee", ph: "01334 845 845" }, inc: 150, fr: 0.1,
    s: [
      { i: "s1", t: "Re-seal the bath and shower", w: "Mould along the bath, worse than last year", a: 60, on: true },
      { i: "s2", t: "New roller blind, bedroom 1", w: "The cord has snapped and it won’t stay up", a: 45, on: true },
      { i: "s3", t: "Top-ups: 6 wine glasses, a frying pan, 2 cushions", w: "Short of the inventory or worn; delivered with the next clean", a: 48 }
    ],
    y: [{ i: "oven", t: "Oven and extractor filter clean", w: "A deep clean of the oven, hob and extractor filters, suggested every year to keep the kitchen guest-ready", a: 85 }],
    yn: "Carried out by our specialist oven-cleaning contractor. Price includes VAT.",
    q: [
      { i: "q1", t: "New stair and landing carpet", w: "Fraying on the 3rd and 7th steps, now a trip risk for guests", lt: "Stairs, page 9 of the full report", on: true },
      { i: "q2", t: "Bathroom refurbishment", w: "Dated, and mentioned in two guest reviews this year", rv: "Lovely cottage, though the bathroom is looking a little tired.", rf: "Guest review, Airbnb, August 2026 · 1 of 2 mentions", lt: "Bathroom, page 6 of the full report" },
      { i: "q3", t: "A new living room sofa", w: "Worn and sagging after about 8 years", rv: "The sofa could do with replacing.", rf: "Guest review, Booking.com, October 2026", lt: "Living room, page 4 of the full report" },
      { i: "photos", t: "A photo refresh for your listing", w: "Your listing photos were taken when the cottage joined us in 2023. We suggest new professional photos every 2 years so the listing looks as good as the cottage does now." }
    ]
  };
  /* ---------- start ---------- */
  readHash().then(function (m) {
    M = clean(m);
    S = { s: {}, y: {}, q: {}, pay: "income", auto: false, err: "" };
    M.s.forEach(function (j) { S.s[j.i] = j.on; }); M.y.forEach(function (j) { S.y[j.i] = j.on; }); M.q.forEach(function (j) { S.q[j.i] = j.on; });
    if (M.p) document.title = M.p + " — choose the work";
    var prev = store("ssf-sent-" + M.t);
    if (prev && prev.at) { S.err = ""; render(); var n = el("div", { class: "note small", text: "You sent your choices on " + longDate(prev.at) + ". You can change them below if you like — we'll use the latest ones." }); app.firstChild.insertBefore(n, app.firstChild.children[2]); }
    else render();
  }).catch(function (e) {
    var msg = e && e.message === "old-browser"
      ? "Your browser is a little too old to open this page. Please try another browser, or reply to our email and we'll help."
      : "This link looks incomplete. Please open it straight from our email, or reply to the email and we'll send it again.";
    app.replaceChildren(el("div", { class: "card" }, [el("h1", { text: "Your condition report" }), el("p", { text: msg }), el("p", { class: "legal", text: LEGAL })]));
  });

})();
