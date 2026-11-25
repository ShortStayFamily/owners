/* Owner approval for a repair or purchase — owners.shortstay.family/ok/
   Opened from the buttons in the approval email. The link carries a summary in #m= (base64url JSON):
   {v:1, t: token, h: hook, b: brand, p: property, w: what we recommend, ti: issue title, c: contractor/item price text,
    f: fee text, tot: total text, pm: {n, ph}, l: let property (Repairing Standard note)} and optionally &a=approve|call|decline.
   The choice posts {kind:"owner-approval", t, act, note, at} to the Zapier workflow "Family Suite — owner approvals",
   which saves it for the Family Suite. Nothing is stored on this site. #demo shows a sample. */
(function () {
  "use strict";
  var BRANDS = {
    sssa: { n: "Short Stay St Andrews", img: "../img/brand-sssa.png" },
    efhh: { n: "East Fife Holiday Homes", img: "../img/brand-efhh.png" },
    stapc: { n: "St Andrews Property Co", img: "../img/brand-stapc.png" }
  };
  var HOOK_OK = /^https:\/\/hooks\.zapier\.com\/hooks\/catch\/\d+\/[A-Za-z0-9]+\/?$/;
  var DEMO = { v: 1, t: "DEMOdemoDEMOdemo0000", h: "", b: "sssa", p: "Flat 2, 9 North Street", ti: "Shower leaking into the flat below", w: "Replace the shower valve and reseal the tray — Ellis Phelps Plumbing", c: "£420.00", f: "£50.40", tot: "£470.40", pm: { n: "Niamh Mckee", ph: "01334 845 845" }, l: false, demo: true };
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
  function b64u(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "=";
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(out);
  }
  var P = {};
  function read() {
    location.hash.replace(/^#/, "").split("&").forEach(function (kv) { var i = kv.indexOf("="); if (i > 0) P[kv.slice(0, i)] = kv.slice(i + 1); else if (kv) P[kv] = ""; });
    if ("demo" in P) return DEMO;
    var m = JSON.parse(b64u(P.m || ""));
    if (!m || m.v !== 1 || !/^[A-Za-z0-9_-]{16,64}$/.test(m.t || "")) throw new Error("bad");
    var pm = m.pm || {};
    return { v: 1, t: m.t, h: HOOK_OK.test(m.h || "") ? m.h : "", b: BRANDS[m.b] ? m.b : "sssa", p: str(m.p, 160), ti: str(m.ti, 200), w: str(m.w, 400), c: str(m.c, 30), f: str(m.f, 30), tot: str(m.tot, 30),
      pm: { n: str(pm.n, 60) || "your property manager", ph: str(pm.ph, 30) || "01334 845 845" }, l: !!m.l };
  }
  var M, S = { act: "", note: "", sending: false, err: "" };
  function first() { return M.pm.n.split(/\s+/)[0]; }
  function head(t) { var B = BRANDS[M.b]; return el("div", { class: "top" }, [el("div", {}, [el("div", { class: "eyebrow", text: B.n + " · " + M.p }), el("h1", { text: t })]), el("img", { src: B.img, alt: B.n })]); }
  function render() {
    app.textContent = "";
    var card = el("div", { class: "card" });
    card.appendChild(head("Your approval"));
    if (M.demo) card.appendChild(el("p", { class: "note", text: "Preview — nothing will be sent." }));
    card.appendChild(el("p", {}, [el("b", { text: M.ti }), M.w ? el("br") : null, M.w ? "We recommend: " + M.w : null]));
    card.appendChild(el("div", { class: "facts" }, [
      M.c ? el("div", {}, [el("span", { text: "Price" }), el("b", { text: M.c })]) : null,
      M.f ? el("div", {}, [el("span", { text: "Our fee (shown separately, inc VAT)" }), el("b", { text: M.f })]) : null,
      el("div", {}, [el("span", { text: "Total, inc VAT" }), el("b", { text: M.tot })]),
      el("div", {}, [el("span", { text: "Your property manager" }), el("b", { text: M.pm.n })])
    ]));
    if (M.l) card.appendChild(el("p", { class: "muted small", text: "As a let property, repairs under the Repairing Standard have to go ahead; if you'd like to talk it through, choose Call me first." }));
    var nt = el("textarea", { id: "o-nt", rows: "2", maxlength: "1000", placeholder: "Anything you'd like us to know (optional)" }); nt.value = S.note;
    nt.addEventListener("input", function () { S.note = nt.value; });
    card.appendChild(el("div", { class: "fld" }, [nt]));
    if (S.err) card.appendChild(el("p", { class: "err", role: "alert", text: S.err }));
    card.appendChild(el("div", { class: "btns" }, [
      el("button", { class: "btn primary report", type: "button", disabled: S.sending, text: S.sending && S.act === "approve" ? "Sending…" : "Approve " + M.tot, on: { click: function () { send("approve"); } } }),
      el("button", { class: "btn report", type: "button", disabled: S.sending, text: S.sending && S.act === "call" ? "Sending…" : "Call me first", on: { click: function () { send("call"); } } }),
      M.l ? null : el("button", { class: "btn report", type: "button", disabled: S.sending, text: S.sending && S.act === "decline" ? "Sending…" : "No thanks", on: { click: function () { send("decline"); } } })
    ]));
    card.appendChild(el("p", { class: "muted small", text: "Approved work appears on your next owner statement. Questions? Call " + M.pm.ph + "." }));
    card.appendChild(el("p", { class: "legal", text: "Short Stay Family, St Andrews Property Co and East Fife Holiday Homes are trading names of Short Stay St Andrews Ltd." }));
    app.appendChild(card);
  }
  function send(act) {
    S.act = act; S.err = "";
    var body = { kind: "owner-approval", t: M.t, act: act, note: S.note.trim(), at: new Date().toISOString() };
    if (M.demo || !M.h) { done(); return; }
    S.sending = true; render();
    var opts = { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify(body) };
    fetch(M.h, opts).then(function (r) { if (!r.ok) throw new Error("http"); })
      .catch(function () { return fetch(M.h, Object.assign({ mode: "no-cors" }, opts)); })
      .then(done)
      .catch(function () { S.sending = false; S.err = "Sorry, that didn't go through. Please try again, reply to our email or call " + M.pm.ph + "."; render(); });
  }
  function done() {
    app.textContent = "";
    var msg = S.act === "approve" ? "Thank you — approved. We'll arrange it and let you know when it's booked." : S.act === "call" ? first() + " will call you to talk it through before anything goes ahead." : "Thank you for letting us know. We won't go ahead; " + first() + " may be in touch if anything changes.";
    app.appendChild(el("div", { class: "card done" }, [head(S.act === "approve" ? "Approved" : S.act === "call" ? "We'll call you" : "Noted"), el("p", { text: msg + (M.demo ? " (Preview — nothing was sent.)" : "") }), el("p", { class: "muted small", text: "Questions? Call " + M.pm.ph + "." })]));
    window.scrollTo(0, 0);
  }
  try { M = read(); render(); if (P.a && ["approve", "call"].indexOf(P.a) >= 0 && !M.demo) { /* the email button names the choice: show it, owner confirms with one press */ var b = app.querySelectorAll(".btns button")[P.a === "approve" ? 0 : 1]; if (b) b.focus(); } }
  catch (e) { app.textContent = ""; app.appendChild(el("div", { class: "card" }, [el("h1", { text: "This link isn't complete" }), el("p", { text: "Please use the buttons in our email, reply to it, or call us on 01334 845 845." })])); }
})();
