/* Register interest in a property — owners.shortstay.family/interest/
   Opened from the buttons in the St Andrews Property Co email that lettings@ sends automatically when a property
   coming free matches someone's waiting-list details. The link carries a summary in #m= (base64url JSON):
   {v:1, t: token, h: hook, p: property, a: area, b: bedrooms, r: rent text, f: free from (YYYY-MM-DD), n: first name}
   and optionally &a=yes|not (the button they pressed). Nothing is sent until they press the button here, so email link
   scanners can't register anything. The press posts {kind:"student-interest", t, act:"yes"|"not", why, note, at} to the
   Zapier workflow "Family Suite — student interest", which saves it for the Family Suite. Nothing is stored on this
   site. #demo shows a sample. */
(function () {
  "use strict";
  var HOOK_OK = /^https:\/\/hooks\.zapier\.com\/hooks\/catch\/\d+\/[A-Za-z0-9]+\/?$/;
  var PHONE = "01334 845 845";
  var DEMO = { v: 1, t: "DEMOdemoDEMOdemo0000", h: "", p: "Flat 2, 31 Market Street", a: "St Andrews town centre", b: "3", r: "£1,950 a month (£650 a room)", f: "2027-09-01", n: "Priya", demo: true };
  var WHY = [["far", "Too far out"], ["dear", "Too expensive"], ["found", "We've found somewhere"], ["other", "Something else"]];
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
  function dayLong(d) { var p = String(d).split("-").map(Number); if (p.length !== 3 || !p[0]) return ""; return new Date(Date.UTC(p[0], p[1] - 1, p[2], 12)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }); }
  var P = {};
  function read() {
    location.hash.replace(/^#/, "").split("&").forEach(function (kv) { var i = kv.indexOf("="); if (i > 0) P[kv.slice(0, i)] = kv.slice(i + 1); else if (kv) P[kv] = ""; });
    if ("demo" in P) return DEMO;
    var m = JSON.parse(b64u(P.m || ""));
    if (!m || m.v !== 1 || !/^[A-Za-z0-9_-]{16,64}$/.test(m.t || "")) throw new Error("bad");
    return { v: 1, t: m.t, h: HOOK_OK.test(m.h || "") ? m.h : "", p: str(m.p, 160), a: str(m.a, 120), b: str(m.b, 6), r: str(m.r, 80), f: /^\d{4}-\d{2}-\d{2}$/.test(m.f || "") ? m.f : "", n: str(m.n, 40) || "there" };
  }
  var M, S = { mode: "yes", why: "", note: "", sending: false, err: "" };
  function head(t) { return el("div", { class: "top" }, [el("div", {}, [el("div", { class: "eyebrow", text: "St Andrews Property Co · Student lets" }), el("h1", { text: t })]), el("img", { src: "../img/brand-stapc.png", alt: "St Andrews Property Co" })]); }
  function legal() { return el("p", { class: "legal", text: "Short Stay Family, St Andrews Property Co and East Fife Holiday Homes are trading names of Short Stay St Andrews Ltd." }); }
  function facts() {
    return el("div", { class: "facts" }, [
      el("div", {}, [el("span", { text: "Property" }), el("b", { text: M.p })]),
      M.a ? el("div", {}, [el("span", { text: "Area" }), el("b", { text: M.a })]) : null,
      M.b ? el("div", {}, [el("span", { text: "Bedrooms" }), el("b", { text: M.b })]) : null,
      M.r ? el("div", {}, [el("span", { text: "Rent" }), el("b", { text: M.r })]) : null,
      M.f ? el("div", {}, [el("span", { text: "Available from" }), el("b", { text: dayLong(M.f) })]) : null
    ]);
  }
  function render() {
    app.textContent = "";
    var card = el("div", { class: "card" });
    card.appendChild(head(S.mode === "not" ? "Not quite right?" : "Interested in this one?"));
    if (M.demo) card.appendChild(el("p", { class: "note", text: "Preview — nothing will be sent." }));
    card.appendChild(el("p", { text: "Hi " + M.n + ", this property matches your waiting-list details." }));
    card.appendChild(facts());
    if (S.mode === "not") {
      card.appendChild(el("p", {}, [el("b", { text: "What's not right about it?" })]));
      var g = el("div", { class: "btns", role: "radiogroup", "aria-label": "Why it's not for you" });
      WHY.forEach(function (w) {
        g.appendChild(el("button", { class: "btn report" + (S.why === w[0] ? " primary" : ""), type: "button", role: "radio", "aria-checked": S.why === w[0] ? "true" : "false", disabled: S.sending, text: w[1], on: { click: function () { S.why = w[0]; render(); } } }));
      });
      card.appendChild(g);
      var nt = el("textarea", { id: "i-nt", rows: "2", maxlength: "500", placeholder: "Anything else we should know (optional)" }); nt.value = S.note;
      nt.addEventListener("input", function () { S.note = nt.value; });
      card.appendChild(el("div", { class: "fld" }, [nt]));
      if (S.err) card.appendChild(el("p", { class: "err", role: "alert", text: S.err }));
      card.appendChild(el("div", { class: "btns" }, [
        el("button", { class: "btn primary report", type: "button", disabled: S.sending, text: S.sending ? "Sending…" : "Send", on: { click: function () { send("not"); } } }),
        el("button", { class: "btn report", type: "button", disabled: S.sending, text: "Actually, I'm interested", on: { click: function () { S.mode = "yes"; S.err = ""; render(); } } })
      ]));
      card.appendChild(el("p", { class: "muted small", text: "We'll use your answer to keep your waiting-list details right, so we only send you properties that fit." }));
    } else {
      card.appendChild(el("p", { class: "muted small", text: "Press the button to register your interest. It moves you up our list for this property, and we'll send you the viewing link in due course." }));
      if (S.err) card.appendChild(el("p", { class: "err", role: "alert", text: S.err }));
      card.appendChild(el("div", { class: "btns" }, [
        el("button", { class: "btn primary report", type: "button", disabled: S.sending, text: S.sending ? "Sending…" : "Yes, I'm interested", on: { click: function () { send("yes"); } } }),
        el("button", { class: "btn report", type: "button", disabled: S.sending, text: "Not for us", on: { click: function () { S.mode = "not"; S.err = ""; render(); } } })
      ]));
    }
    card.appendChild(el("p", { class: "muted small", text: "Questions? Reply to our email or call " + PHONE + "." }));
    card.appendChild(legal());
    app.appendChild(card);
  }
  function send(act) {
    S.err = "";
    if (act === "not" && !S.why) { S.err = "Please choose one of the options above."; render(); return; }
    var body = { kind: "student-interest", t: M.t, act: act, why: act === "not" ? S.why : "", note: act === "not" ? S.note.trim() : "", at: new Date().toISOString() };
    if (M.demo || !M.h) { done(act); return; }
    S.sending = true; render();
    var opts = { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify(body) };
    fetch(M.h, opts).then(function (r) { if (!r.ok) throw new Error("http"); })
      .catch(function () { return fetch(M.h, Object.assign({ mode: "no-cors" }, opts)); })
      .then(function () { done(act); })
      .catch(function () { S.sending = false; S.err = "Sorry, that didn't go through. Please try again, reply to our email or call " + PHONE + "."; render(); });
  }
  function done(act) {
    app.textContent = "";
    var card = el("div", { class: "card" });
    card.appendChild(head("Thank you"));
    if (M.demo) card.appendChild(el("p", { class: "note", text: "Preview — nothing was sent." }));
    if (act === "yes") {
      card.appendChild(el("p", {}, [el("b", { text: "Thanks, " + M.n + " — we've noted your interest in " + M.p + "." })]));
      card.appendChild(el("p", { text: "We'll send you the viewing link in due course. If your plans change, just reply to our email." }));
    } else {
      card.appendChild(el("p", {}, [el("b", { text: "Thanks for letting us know." })]));
      card.appendChild(el("p", { text: S.why === "found" ? "Good luck in your new place — we'll take you off our list. If that changes, just get in touch." : "We'll keep your details up to date and only send you properties that fit." }));
    }
    card.appendChild(legal());
    app.appendChild(card);
  }
  try { M = read(); } catch (e) { M = null; }
  if (!M) {
    app.textContent = "";
    app.appendChild(el("div", { class: "card" }, [el("h1", { text: "This link isn't complete" }), el("p", { text: "Please use the button in our email again, or call us on " + PHONE + "." }), legal()]));
    return;
  }
  if (P.a === "not") S.mode = "not";
  render();
})();
