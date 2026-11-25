/* "We'd like to go ahead" — owners.shortstay.family/go/
   Opened from the button in the proforma email. The link carries the proposal summary in its #m= part (base64url JSON):
   {v:1, t: token, h: hook, b: brand, p: property, o: owner's first name, k: "stl"|"prt"|"hybrid", f: headline figure text,
    c: fee text, pm: {n, ph, bk}, x: valid until (YYYY-MM-DD)}
   Confirm posts {kind:"go-ahead", t, phone, when, start, note, at} to the Zapier workflow "Family Suite — owner go-ahead",
   which saves it for the Family Suite. Nothing is signed here and nothing is stored on this site. #demo shows a sample. */
(function () {
  "use strict";
  var BRANDS = {
    sssa: { n: "Short Stay St Andrews", img: "../img/brand-sssa.png" },
    efhh: { n: "East Fife Holiday Homes", img: "../img/brand-efhh.png" },
    stapc: { n: "St Andrews Property Co", img: "../img/brand-stapc.png" }
  };
  var HOOK_OK = /^https:\/\/hooks\.zapier\.com\/hooks\/catch\/\d+\/[A-Za-z0-9]+\/?$/;
  var DEMO = { v: 1, t: "DEMOdemoDEMOdemo0000", h: "", b: "sssa", p: "Flat 2, 9 North Street, St Andrews", o: "Sarah", k: "stl", f: "£24,600 a year, central estimate", c: "20% + VAT", pm: { n: "Niamh Mckee", ph: "01334 845 845", bk: "" }, x: "2026-12-28", demo: true };
  var app = document.getElementById("app");

  function el(tag, a, kids) {
    var n = document.createElement(tag); a = a || {};
    Object.keys(a).forEach(function (k) {
      if (k === "text") n.textContent = a[k];
      else if (k === "on") Object.keys(a.on).forEach(function (ev) { n.addEventListener(ev, a.on[ev]); });
      else if (a[k] === true) n.setAttribute(k, "");
      else if (a[k] !== false && a[k] != null) n.setAttribute(k, a[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function str(v, max) { return String(v == null ? "" : v).slice(0, max || 200); }
  function safeUrl(u) { return typeof u === "string" && /^https:\/\/[^\s"<>]+$/i.test(u) ? u : ""; }
  function longDate(iso) { var d = new Date(String(iso).slice(0, 10) + "T12:00:00"); return isNaN(d) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); }
  function b64u(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "=";
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(out);
  }
  function read() {
    var h = location.hash.replace(/^#/, ""), p = {};
    h.split("&").forEach(function (kv) { var i = kv.indexOf("="); if (i > 0) p[kv.slice(0, i)] = kv.slice(i + 1); else if (kv) p[kv] = ""; });
    if ("demo" in p) return DEMO;
    var m = JSON.parse(b64u(p.m || ""));
    if (!m || m.v !== 1 || !/^[A-Za-z0-9_-]{16,64}$/.test(m.t || "")) throw new Error("bad");
    var pm = m.pm || {};
    return { v: 1, t: m.t, h: HOOK_OK.test(m.h || "") ? m.h : "", b: BRANDS[m.b] ? m.b : "sssa", p: str(m.p, 160), o: str(m.o, 60), k: ["stl", "prt", "hybrid"].indexOf(m.k) >= 0 ? m.k : "stl",
      f: str(m.f, 120), c: str(m.c, 40), pm: { n: str(pm.n, 60) || "your property manager", ph: str(pm.ph, 30) || "01334 845 845", bk: safeUrl(pm.bk) }, x: str(m.x, 10) };
  }

  var M, S = { phone: "", when: "", start: "", note: "", hp: "", sending: false, err: "" };
  function first() { return M.pm.n.split(/\s+/)[0]; }
  function head() {
    var B = BRANDS[M.b];
    return el("div", { class: "top" }, [el("div", {}, [el("div", { class: "eyebrow", text: B.n + " · part of the Short Stay Family" }), el("h1", { text: M.o ? "Thank you, " + M.o : "Thank you" })]), el("img", { src: B.img, alt: B.n })]);
  }
  function chips(key, items) {
    return el("div", { class: "chips", role: "radiogroup" }, items.map(function (it) {
      var inp = el("input", { type: "radio", name: key, value: it[0] }); inp.checked = S[key] === it[0];
      inp.addEventListener("change", function () { S[key] = it[0]; render(); });
      return el("label", { class: "chip" + (S[key] === it[0] ? " on" : "") }, [inp, it[1]]);
    }));
  }
  function render() {
    app.textContent = "";
    var card = el("div", { class: "card" }), prt = M.k === "prt";
    card.appendChild(head());
    if (M.demo) card.appendChild(el("p", { class: "note", text: "Preview — nothing will be sent." }));
    card.appendChild(el("p", { text: prt ? "Let's get " + M.p + " ready for its first tenants. Confirm a couple of details and " + first() + " will call you." : "Let's get " + M.p + " ready for its first guests. Confirm a couple of details and " + first() + " will call you." }));
    card.appendChild(el("div", { class: "facts" }, [
      el("div", {}, [el("span", { text: "Property" }), el("b", { text: M.p })]),
      M.f ? el("div", {}, [el("span", { text: "Your proposal" }), el("b", { text: M.f })]) : null,
      M.c ? el("div", {}, [el("span", { text: "Management" }), el("b", { text: M.c })]) : null,
      el("div", {}, [el("span", { text: "Your property manager" }), el("b", { text: M.pm.n })])
    ]));
    var ph = el("input", { id: "g-ph", type: "tel", autocomplete: "tel", maxlength: "40", inputmode: "tel" }); ph.value = S.phone;
    ph.addEventListener("input", function () { S.phone = ph.value; });
    card.appendChild(el("div", { class: "fld" }, [el("label", { for: "g-ph", text: "Best number to call you" }), ph]));
    card.appendChild(el("div", { class: "fld" }, [el("span", { class: "lbl", text: "When's best for a call?" }), chips("when", [["morning", "Morning"], ["afternoon", "Afternoon"], ["evening", "Early evening"]])]));
    card.appendChild(el("div", { class: "fld" }, [el("span", { class: "lbl", text: prt ? "When would you like it to be let from?" : "When would you like to start taking bookings?" }), chips("start", [["asap", "As soon as possible"], ["spring", "Spring 2027"], ["summer", "Summer 2027"], ["unsure", "Not sure yet"]])]));
    var nt = el("textarea", { id: "g-nt", rows: "3", maxlength: "1500" }); nt.value = S.note;
    nt.addEventListener("input", function () { S.note = nt.value; });
    card.appendChild(el("div", { class: "fld" }, [el("label", { for: "g-nt" }, ["Anything we should know? ", el("span", { class: "hint", text: "Optional" })]), nt]));
    var hp = el("input", { type: "text", tabindex: "-1", autocomplete: "off", "aria-hidden": "true" }); hp.addEventListener("input", function () { S.hp = hp.value; });
    card.appendChild(el("div", { class: "hp" }, [el("label", { text: "Leave this empty" }), hp]));
    if (S.err) card.appendChild(el("p", { class: "err", role: "alert", text: S.err }));
    card.appendChild(el("div", { class: "btns" }, [el("button", { class: "btn primary report", type: "button", text: S.sending ? "Sending…" : "Confirm — we'd like to go ahead", disabled: S.sending, on: { click: send } })]));
    card.appendChild(el("p", { class: "muted small", text: "Nothing is signed yet. " + first() + " will talk you through the agreement first." }));
    card.appendChild(el("h2", { text: "What happens next" }));
    card.appendChild(el("ol", { class: "steps" }, [
      el("li", { text: first() + " calls you at the time you chose." }),
      el("li", { text: "Your management agreement, to sign online." }),
      el("li", { text: prt ? "We arrange the safety certificates and inventory, then advertise and find your tenants." : "We help with the short-term let licence and safety checks, then photos and your listing." })
    ]));
    card.appendChild(el("p", { class: "legal", text: "Short Stay Family, St Andrews Property Co and East Fife Holiday Homes are trading names of Short Stay St Andrews Ltd." }));
    app.appendChild(card);
  }
  function send() {
    if (!S.phone.replace(/\D/g, "") || S.phone.replace(/\D/g, "").length < 7) { S.err = "Please add the best number to call you."; render(); return; }
    S.err = "";
    var body = { kind: "go-ahead", t: M.t, phone: S.phone.trim(), when: S.when, start: S.start, note: S.note.trim(), hp: S.hp, at: new Date().toISOString() };
    if (M.demo || !M.h) { done(); return; }
    S.sending = true; render();
    var opts = { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify(body) };
    fetch(M.h, opts).then(function (r) { if (!r.ok) throw new Error("http"); })
      .catch(function () { return fetch(M.h, Object.assign({ mode: "no-cors" }, opts)); })
      .then(done)
      .catch(function () { S.sending = false; S.err = "Sorry, that didn't go through. Please try again, reply to our email or call us on " + M.pm.ph + "."; render(); });
  }
  function done() {
    app.textContent = "";
    app.appendChild(el("div", { class: "card done" }, [head(),
      el("h2", { text: "Wonderful — thank you" + (M.demo ? " (preview — nothing was sent)" : "") }),
      el("p", { text: first() + " has your details and will call you" + (S.when ? " in the " + (S.when === "evening" ? "early evening" : S.when) : "") + " to talk through the agreement and next steps for " + M.p + "." }),
      M.pm.bk ? el("p", {}, ["Prefer to pick a time yourself? ", el("a", { href: M.pm.bk, text: "Book a call with " + first() }), "."]) : null,
      el("p", { class: "muted small", text: "Questions in the meantime? Reply to our email or call " + M.pm.ph + "." })]));
    window.scrollTo(0, 0);
  }
  try { M = read(); render(); }
  catch (e) { app.textContent = ""; app.appendChild(el("div", { class: "card" }, [el("h1", { text: "This link isn't complete" }), el("p", { text: "Please use the button in your proposal email, reply to that email, or call us on 01334 845 845." })])); }
})();
