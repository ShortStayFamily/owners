/* Report a repair — owners.shortstay.family/repair/
   A tenant, guest or owner tells us what's wrong. The form posts (text/plain JSON) to the Zapier workflow
   "Family Suite — repair requests", which saves it in SharePoint › Property Management › Maintenance ›
   Repair requests. The Family Suite turns it into a New maintenance issue for the property manager.
   No data is kept on this site. Optional link parts: ?b=stapc|sssa|efhh (brand), ?a=address, ?pc=postcode, ?r=tenant|guest|owner */
(function () {
  "use strict";
  var HOOK = "https://hooks.zapier.com/hooks/catch/10109363/CqHNrNkLIQWLXBon8/";
  var BRANDS = {
    stapc: { n: "St Andrews Property Co", img: "../img/brand-stapc.png", mail: "lettings@standrewsproperty.co.uk" },
    sssa: { n: "Short Stay St Andrews", img: "../img/brand-sssa.png", mail: "clients@shortstay.family" },
    efhh: { n: "East Fife Holiday Homes", img: "../img/brand-efhh.png", mail: "clients@shortstay.family" }
  };
  var PHONE = "01334 845 845";
  var qs = new URLSearchParams(location.search);
  /* student tenants use the St Andrews Property Co website form (self-help checks, photos, a reference by email) */
  var TENANT_FORM = "https://standrewsproperty.co.uk/maintenance-request/";
  if (qs.get("b") === "stapc" || qs.get("r") === "tenant") { location.replace(TENANT_FORM); return; }
  var B = BRANDS[qs.get("b")] || BRANDS.sssa;
  var DEMO = location.hash === "#demo";
  var app = document.getElementById("app");

  var S = {
    name: "", email: "", phone: "", role: ["guest", "owner"].indexOf(qs.get("r")) >= 0 ? qs.get("r") : "guest",
    address: (qs.get("a") || "").slice(0, 200), postcode: (qs.get("pc") || "").slice(0, 12),
    what: "", where: "", urgency: "routine", access: "", enter: true, hp: "", err: "", sending: false
  };
  try { var saved = JSON.parse(localStorage.getItem("ssf-repair-me") || "null"); if (saved) { S.name = saved.name || ""; S.email = saved.email || ""; S.phone = saved.phone || ""; } } catch (e) { /* storage off */ }

  function el(tag, a, kids) {
    var n = document.createElement(tag);
    a = a || {};
    Object.keys(a).forEach(function (k) {
      if (k === "text") n.textContent = a[k];
      else if (k === "on") Object.keys(a.on).forEach(function (ev) { n.addEventListener(ev, a.on[ev]); });
      else if (a[k] === true) n.setAttribute(k, "");
      else if (a[k] !== false && a[k] != null) n.setAttribute(k, a[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function head(sub) {
    return el("div", { class: "top" }, [
      el("div", {}, [el("div", { class: "eyebrow", text: sub }), el("h1", { text: "Report a repair" })]),
      el("img", { src: B.img, alt: B.n })
    ]);
  }
  function field(key, label, type, opts) {
    opts = opts || {};
    var id = "f-" + key;
    var input = type === "textarea"
      ? el("textarea", { id: id, rows: opts.rows || 4, maxlength: opts.max || 3000, placeholder: opts.ph || "" })
      : el("input", { id: id, type: type, maxlength: opts.max || 200, autocomplete: opts.ac || "off", placeholder: opts.ph || "", inputmode: opts.im || null });
    input.value = S[key] || "";
    input.addEventListener("input", function () { S[key] = input.value; });
    return el("div", { class: "fld" }, [
      el("label", { for: id }, [label, opts.req ? el("span", { class: "req", text: " *" }) : null, opts.hint ? el("span", { class: "hint", text: " — " + opts.hint }) : null]),
      input
    ]);
  }
  function chips(key, items, cb) {
    return el("div", { class: "chips", role: "radiogroup" }, items.map(function (it) {
      var inp = el("input", { type: "radio", name: key, value: it[0] });
      inp.checked = S[key] === it[0];
      inp.addEventListener("change", function () { S[key] = it[0]; render(); if (cb) cb(); });
      return el("label", { class: "chip" + (S[key] === it[0] ? " on" : "") }, [inp, el("span", {}, [it[1], it[2] ? el("span", { class: "why", text: it[2] }) : null])]);
    }));
  }

  function render() {
    var y = window.scrollY;
    app.textContent = "";
    var card = el("div", { class: "card" });
    card.appendChild(head(B.n));
    card.appendChild(el("p", { class: "muted", text: "Tell us what's wrong and we'll pass it straight to the property manager. It takes about two minutes." }));
    card.appendChild(el("div", { class: "warn" }, [
      el("b", { text: "Smell gas? Leave the property and call the gas emergency line on 0800 111 999 now." }),
      "For anything else dangerous right now — water pouring through a ceiling, no heat or power, a door that won't lock — please call us on " + PHONE + " as well as using this form."
    ]));

    card.appendChild(el("h2", { text: "The property" }));
    card.appendChild(el("div", { class: "two" }, [
      field("address", "Address", "text", { req: true, ac: "street-address", ph: "e.g. 12 North Street, St Andrews" }),
      field("postcode", "Postcode", "text", { req: true, ac: "postal-code", max: 12, ph: "KY16 9AA" })
    ]));
    card.appendChild(el("div", { class: "fld" }, [el("span", { class: "lbl", text: "You are the…" }), chips("role", [["guest", "Holiday guest"], ["owner", "Owner"], ["other", "Someone else"]])]));
    card.appendChild(el("p", { class: "muted small" }, ["Student tenant? Please use ", el("a", { href: TENANT_FORM, text: "the St Andrews Property Co repair form" }), " instead."]));

    card.appendChild(el("h2", { text: "What's wrong" }));
    card.appendChild(field("what", "Describe the problem", "textarea", { req: true, rows: 5, ph: "What's happened, when it started, and anything you've already tried." }));
    card.appendChild(field("where", "Where in the property", "text", { ph: "e.g. upstairs bathroom, kitchen, front door", max: 200 }));
    card.appendChild(el("div", { class: "fld" }, [el("span", { class: "lbl", text: "How urgent is it?" }), chips("urgency", [
      ["emergency", "Emergency", "Danger to people or the building right now"],
      ["urgent", "Urgent", "Needs sorting within a day or two"],
      ["routine", "Routine", "Can wait for a booked visit"]
    ])]));
    if (S.urgency === "emergency") card.appendChild(el("p", { class: "note", text: "Please also call us now on " + PHONE + " so someone can act straight away." }));

    card.appendChild(el("h2", { text: "Getting in" }));
    var ent = el("input", { type: "checkbox" }); ent.checked = !!S.enter;
    ent.addEventListener("change", function () { S.enter = ent.checked; });
    card.appendChild(el("label", { class: "auto" }, [ent, el("span", { text: "A contractor can let themselves in with our keys if nobody is home (we'll always give notice first)." })]));
    card.appendChild(field("access", "Best times to visit, pets, anything we should know", "textarea", { rows: 2, max: 600 }));

    card.appendChild(el("h2", { text: "Your details" }));
    card.appendChild(field("name", "Your name", "text", { req: true, ac: "name", max: 120 }));
    card.appendChild(el("div", { class: "pair" }, [
      field("email", "Email", "email", { req: true, ac: "email", max: 160 }),
      field("phone", "Mobile", "tel", { ac: "tel", max: 40, im: "tel", hint: "so the contractor can call" })
    ]));
    var hp = el("input", { type: "text", tabindex: "-1", autocomplete: "off", "aria-hidden": "true" });
    hp.addEventListener("input", function () { S.hp = hp.value; });
    card.appendChild(el("div", { class: "hp" }, [el("label", { text: "Leave this empty" }), hp]));

    if (S.err) card.appendChild(el("p", { class: "err", role: "alert", text: S.err }));
    var btn = el("button", { class: "btn primary report", type: "button", text: S.sending ? "Sending…" : "Send repair request", disabled: S.sending, on: { click: send } });
    card.appendChild(el("div", { class: "btns" }, [btn]));
    card.appendChild(el("p", { class: "legal", text: "We use these details only to deal with this repair. " + B.n + " is a trading name of Short Stay St Andrews Ltd." }));
    app.appendChild(card);
    window.scrollTo(0, y);
  }

  function check() {
    if ((S.what || "").trim().length < 5) return "Please describe the problem.";
    if (!(S.address || "").trim() && !(S.postcode || "").trim()) return "Please tell us the property's address or postcode.";
    if (!(S.name || "").trim()) return "Please tell us your name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((S.email || "").trim())) return "Please check your email address.";
    return "";
  }

  function send() {
    S.err = check();
    if (S.err) { render(); return; }
    var body = {
      kind: "repair", v: 1,
      name: S.name.trim(), email: S.email.trim(), phone: S.phone.trim(), role: S.role,
      address: S.address.trim(), postcode: S.postcode.trim(), what: S.what.trim(), where: S.where.trim(),
      urgency: S.urgency, access: S.access.trim(), enter: !!S.enter, hp: S.hp, at: new Date().toISOString()
    };
    try { localStorage.setItem("ssf-repair-me", JSON.stringify({ name: body.name, email: body.email, phone: body.phone })); } catch (e) { /* storage off */ }
    if (DEMO) { done(body, true); return; }
    S.sending = true; render();
    var opts = { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify(body) };
    fetch(HOOK, opts).then(function (r) { if (!r.ok) throw new Error("http " + r.status); })
      .catch(function () { return fetch(HOOK, Object.assign({ mode: "no-cors" }, opts)); })
      .then(function () { done(body, false); })
      .catch(function () { S.sending = false; S.err = "Sorry, that didn't go through. Please check your connection and try again, or call us on " + PHONE + "."; render(); });
  }

  function done(body, demo) {
    app.textContent = "";
    var urgent = body.urgency !== "routine";
    app.appendChild(el("div", { class: "card done" }, [
      head(B.n),
      el("div", { class: "tick", "aria-hidden": "true" }, [svgTick()]),
      el("h2", { text: "Thank you — we've got it" + (demo ? " (preview — nothing was sent)" : "") }),
      el("p", { text: "Your repair request for " + (body.address || body.postcode) + " has gone to the property manager. " + (urgent ? "Because it's " + body.urgency + ", someone will look at it today." : "We'll be in touch to arrange a visit.") }),
      urgent ? el("p", { class: "note", text: "If it gets worse or becomes dangerous, please call us on " + PHONE + "." }) : null,
      el("p", { class: "muted small", text: "Need to add photos? Reply to any email from us, or send them to " + B.mail + " with the address in the subject." }),
      el("div", { class: "btns" }, [el("button", { class: "btn report", type: "button", text: "Report something else", on: { click: function () { S.what = ""; S.where = ""; S.urgency = "routine"; S.err = ""; S.sending = false; render(); window.scrollTo(0, 0); } } })])
    ]));
    window.scrollTo(0, 0);
  }
  function svgTick() {
    var ns = "http://www.w3.org/2000/svg", s = document.createElementNS(ns, "svg");
    s.setAttribute("width", "22"); s.setAttribute("height", "22"); s.setAttribute("viewBox", "0 0 24 24");
    var p = document.createElementNS(ns, "path");
    p.setAttribute("d", "M5 12.5l4.5 4.5L19 7.5"); p.setAttribute("fill", "none"); p.setAttribute("stroke", "#fff"); p.setAttribute("stroke-width", "2.6"); p.setAttribute("stroke-linecap", "round"); p.setAttribute("stroke-linejoin", "round");
    s.appendChild(p); return s;
  }

  render();
})();
