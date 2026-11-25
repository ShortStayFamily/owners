/* Viewing booking page — owners.shortstay.family/view/
   Opened from the buttons in a St Andrews Property Co viewing invite. The link carries the round in #m= (base64url JSON):
   {v:1, r: round id (VR-…), t: this group's token, h: hook, p: property, a: address, d: date, s: [15-minute start times],
    c: booking closes (ISO), n: first name, w: where to meet}, and optionally &s=HH:MM (the time they pressed) or
   &a=cancel | &a=decline. Nothing is booked until they press the button here (so email link scanners can't book).
   The press posts {kind:"view-book"|"view-cancel", r, t, slot, ps} to the Zapier workflow "Family Suite — viewings",
   which gives out times first come, first served and puts the outcome in Storage by Zapier under ps, a one-off key
   made here; this page waits for it (usually a few seconds). Nothing is stored on this site. #demo shows a sample. */
(function () {
  "use strict";
  var HOOK_OK = /^https:\/\/hooks\.zapier\.com\/hooks\/catch\/\d+\/[A-Za-z0-9]+\/?$/;
  var STORE = "https://store.zapier.com/api/records?secret=";
  var PHONE = "01334 845 845";
  var app = document.getElementById("app");
  var DEMO = { v: 1, r: "VR-261210-DEMO", t: "DEMOdemoDEMOdemoDEMOdemo", h: "", p: "Flat 1, 3 Market Street", a: "3 Market Street, St Andrews, KY16 9NS", d: "2026-12-09", s: ["16:00", "16:15", "16:30", "16:45", "17:00", "17:15"], c: "2099-01-01T00:00:00Z", n: "Ellie", w: "At the front door", demo: true };
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
  function b64u(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "=";
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(out);
  }
  function hm12(hm) { var p = String(hm).split(":"), h = +p[0], m = +p[1]; return ((h + 11) % 12 + 1) + (m ? ":" + String(m).padStart(2, "0") : "") + (h < 12 ? "am" : "pm"); }
  function dayLong(d) { var p = String(d).split("-").map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2], 12)).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }); }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16); crypto.getRandomValues(b); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  }
  var P = {};
  function read() {
    location.hash.replace(/^#/, "").split("&").forEach(function (kv) { var i = kv.indexOf("="); if (i > 0) P[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); else if (kv) P[kv] = ""; });
    if ("demo" in P) return DEMO;
    var m = JSON.parse(b64u(P.m || ""));
    if (!m || m.v !== 1 || !/^VR-\d{6}-[A-Z0-9]{1,8}$/.test(m.r || "") || !/^[A-Za-z0-9]{24}$/.test(m.t || "")) throw new Error("bad");
    var slots = (Array.isArray(m.s) ? m.s : []).filter(function (x) { return /^\d{2}:\d{2}$/.test(x); }).slice(0, 12);
    if (!slots.length || !/^\d{4}-\d{2}-\d{2}$/.test(m.d || "")) throw new Error("bad");
    return { v: 1, r: m.r, t: m.t, h: HOOK_OK.test(m.h || "") ? m.h : "", p: str(m.p, 160), a: str(m.a, 200), d: m.d, s: slots, c: str(m.c, 40), n: str(m.n, 40) || "there", w: str(m.w, 120) };
  }
  var M, S = { mode: "book", slot: "", why: "", sending: false, err: "" };
  function head(t) { return el("div", { class: "top" }, [el("div", {}, [el("div", { class: "eyebrow", text: "St Andrews Property Co · Viewing" }), el("h1", { text: t })]), el("img", { src: "../img/brand-stapc.png", alt: "St Andrews Property Co" })]); }
  function legal() { return el("p", { class: "legal", text: "Short Stay Family, St Andrews Property Co and East Fife Holiday Homes are trading names of Short Stay St Andrews Ltd." }); }
  function facts(extra) {
    return el("div", { class: "facts" }, [
      el("div", {}, [el("span", { text: "Property" }), el("b", { text: M.p })]),
      el("div", {}, [el("span", { text: "Day" }), el("b", { text: dayLong(M.d) })]),
      M.a ? el("div", {}, [el("span", { text: "Address" }), el("b", { text: M.a })]) : null,
      M.w ? el("div", {}, [el("span", { text: "Meet" }), el("b", { text: M.w })]) : null,
      extra || null
    ]);
  }
  function closed() { return M.c && Date.parse(M.c) <= Date.now(); }
  function render() {
    app.textContent = "";
    var card = el("div", { class: "card" });
    if (M.demo) card.appendChild(el("p", { class: "note", text: "Preview — nothing will be sent." }));
    if (closed() && S.mode !== "cancel") {
      card.appendChild(head("Booking has closed"));
      card.appendChild(facts());
      card.appendChild(el("p", { text: "Booking for this viewing closed two hours before it starts. If you'd still like to see it, please reply to our email or call us on " + PHONE + "." }));
      card.appendChild(legal()); app.appendChild(card); return;
    }
    if (S.mode === "cancel" || S.mode === "decline") {
      var isCancel = S.mode === "cancel";
      card.appendChild(head(isCancel ? "Can't make your viewing?" : "Not able to view?"));
      card.appendChild(facts());
      card.appendChild(el("p", { text: isCancel ? "No problem — we'll free your time for someone else and keep you on our waiting list." : "Thanks for letting us know. We'll offer the time to someone else and keep you on our waiting list for other properties." }));
      var why = el("textarea", { id: "v-why", rows: "2", maxlength: "300", placeholder: "Anything you'd like us to know (optional)", "aria-label": "Anything you'd like us to know (optional)" }); why.value = S.why;
      why.addEventListener("input", function () { S.why = why.value; });
      card.appendChild(el("div", { class: "fld" }, [why]));
      if (S.err) card.appendChild(el("p", { class: "err", role: "alert", text: S.err }));
      card.appendChild(el("div", { class: "btns" }, [el("button", { class: "btn primary report", type: "button", disabled: S.sending, text: S.sending ? "Sending…" : isCancel ? "Cancel my viewing" : "We can't make it", on: { click: function () { send("view-cancel"); } } })]));
      if (!closed()) card.appendChild(el("button", { class: "link", type: "button", text: isCancel ? "Choose another time instead" : "Actually, we'd like to choose a time", on: { click: function () { S.mode = "book"; S.err = ""; render(); } } }));
      card.appendChild(legal()); app.appendChild(card); return;
    }
    card.appendChild(head("Choose your viewing time"));
    card.appendChild(el("p", { text: "Hello " + M.n + ". Pick a 15-minute time for your group — one group per time, first come, first served." }));
    card.appendChild(facts());
    var grid = el("div", { class: "slots", role: "group", "aria-label": "Viewing times" });
    M.s.forEach(function (s) {
      grid.appendChild(el("button", { class: "slot", type: "button", "aria-pressed": S.slot === s ? "true" : "false", text: hm12(s), on: { click: function () { S.slot = s; S.err = ""; render(); var b = document.getElementById("v-go"); if (b) b.focus(); } } }));
    });
    card.appendChild(grid);
    card.appendChild(el("p", { class: "muted small", text: "If your time has just been taken, we'll give you the nearest free one and tell you straight away. Booking closes two hours before the first viewing." }));
    if (S.err) card.appendChild(el("p", { class: "err", role: "alert", text: S.err }));
    card.appendChild(el("div", { class: "btns" }, [el("button", { id: "v-go", class: "btn primary report", type: "button", disabled: S.sending || !S.slot, text: S.sending ? "Booking…" : S.slot ? "Book " + hm12(S.slot) : "Choose a time above", on: { click: function () { send("view-book"); } } })]));
    card.appendChild(el("button", { class: "link", type: "button", text: "We can't make it", on: { click: function () { S.mode = "decline"; S.err = ""; render(); } } }));
    card.appendChild(legal());
    app.appendChild(card);
  }
  function send(kind) {
    S.err = "";
    var ps = uuid();
    var body = { kind: kind, r: M.r, t: M.t, slot: kind === "view-book" ? S.slot : "", why: kind === "view-cancel" ? S.why.trim().slice(0, 300) : "", ps: ps, at: new Date().toISOString() };
    if (M.demo || !M.h) { finish(kind, M.demo ? { result: kind === "view-book" ? "booked" : "cancelled", slot: S.slot, want: S.slot } : null); return; }
    S.sending = true; render();
    var opts = { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify(body) };
    fetch(M.h, opts).then(function (r) { if (!r.ok) throw new Error("http"); })
      .catch(function () { return fetch(M.h, Object.assign({ mode: "no-cors" }, opts)); })
      .then(function () { waiting(kind, ps); })
      .catch(function () { S.sending = false; S.err = "Sorry, that didn't go through. Please try again, reply to our email or call " + PHONE + "."; render(); });
  }
  function waiting(kind, ps) {
    app.textContent = "";
    app.appendChild(el("div", { class: "card done" }, [head(kind === "view-book" ? "Booking " + hm12(S.slot) + "…" : "Letting us know…"), el("div", { class: "spin", "aria-hidden": "true" }), el("p", { class: "muted", text: "Just a moment while we check the time is still free." })]));
    var t0 = Date.now();
    (function poll() {
      fetch(STORE + ps, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (d) {
        var res = d && d.res;
        if (res && typeof res === "object") return finish(kind, res);
        if (Date.now() - t0 > 60000) return finish(kind, null);
        setTimeout(poll, 2500);
      }).catch(function () { if (Date.now() - t0 > 60000) finish(kind, null); else setTimeout(poll, 3000); });
    })();
  }
  function finish(kind, res) {
    app.textContent = "";
    var title, msg, r = res && res.result;
    if (kind === "view-book") {
      if (!res) { title = "Thank you"; msg = "We've got your request for " + hm12(S.slot) + ". Your confirmation, with a calendar invite, will be with you by email shortly."; }
      else if (r === "booked" || r === "moved" || r === "no change") {
        var got = res.slot || S.slot;
        title = "You're booked for " + hm12(got);
        msg = (res.want && res.want !== got ? hm12(res.want) + " had just been taken, so we've given you " + hm12(got) + ". " : "") + (r === "no change" ? "That's the time you already had. " : "") + "A confirmation with a calendar invite is on its way by email.";
      }
      else if (r === "kept") { title = "Your time is unchanged"; msg = "Every other time has gone, so we've kept your viewing at " + hm12(res.slot) + "."; }
      else if (r === "full") { title = "Every time has gone"; msg = "Sorry — all the viewing times are now taken. You're first in line: if one comes free, we'll email you straight away."; }
      else if (r === "closed") { title = "Booking has closed"; msg = "Booking for this viewing has closed. If you'd still like to see it, please reply to our email or call us on " + PHONE + "."; }
      else if (r === "cancelled") { title = "This viewing was cancelled"; msg = "We're sorry — this viewing has been cancelled. We'll be in touch if we arrange another one."; }
      else { title = "Something wasn't right"; msg = "We couldn't match this link to a viewing. Please reply to our email or call us on " + PHONE + "."; }
    } else {
      title = "Thanks for letting us know";
      msg = r === "cancelled" ? "Your viewing is cancelled — please delete it from your calendar. We'll keep you on our waiting list." : "We'll offer the time to someone else and keep you on our waiting list for other properties.";
    }
    app.appendChild(el("div", { class: "card done" }, [head(title), el("p", { text: msg + (M.demo ? " (Preview — nothing was sent.)" : "") }), facts(), el("p", { class: "muted small", text: "Questions? Reply to our email or call " + PHONE + "." }), legal()]));
    window.scrollTo(0, 0);
  }
  try {
    M = read();
    if (P.a === "cancel") S.mode = "cancel"; else if (P.a === "decline") S.mode = "decline";
    if (P.s && M.s.indexOf(P.s) >= 0) S.slot = P.s;
    render();
    var go = document.getElementById("v-go"); if (go && S.slot) go.focus();
  } catch (e) { app.textContent = ""; app.appendChild(el("div", { class: "card" }, [el("h1", { text: "This link isn't complete" }), el("p", { text: "Please use the buttons in our email, reply to it, or call us on " + PHONE + "." })])); }
})();
