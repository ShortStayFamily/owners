# owners

Owner choice pages for **owners.shortstay.family** — static page code only, no owner data.

After a condition report, the Family Suite emails the owner a link to this page. The owner ticks the small jobs and yearly work they want, says which bigger jobs we should get quotes for, picks how to pay, and approves.

Preview: <https://owners.shortstay.family/#demo>

## How it works

- **Nothing about any owner or property is stored here.** The menu travels in the link's `#` part (it never reaches a web server). `#m=` is base64url JSON; `#z=` is the same JSON deflate-raw compressed.
- The owner's choices are POSTed (as `text/plain` JSON) to the Zapier catch hook named in the menu. Only `https://hooks.zapier.com/hooks/catch/…` addresses are accepted.
- The workflow **"Family Suite — owner choices"** looks up `menu-<token>.json` that the Suite saved in SharePoint and works from *those* prices and items. Editing the link therefore changes nothing we act on. The hook is idempotent per token: the latest submission wins, and only one invoice is raised.
- **Paying there and then:** when the owner's income won't cover the total (or they choose to pay now), the workflow raises a Xero invoice on the Ancillary Services branding theme straight away — the same Stripe "Pay now" mechanism as appraisal invoices, no card surcharge — and leaves its secure payment link in Storage by Zapier under the menu's private pay key (`ps`, a UUID4 in the link). The page waits for it (usually 10–20 seconds) and takes the owner straight to the payment page. If it doesn't arrive within 90 seconds the page says a payment link will be emailed instead.

## Menu format (v1)

```json
{
  "v": 1,
  "t": "token, 16–64 chars [A-Za-z0-9_-]",
  "h": "https://hooks.zapier.com/hooks/catch/…",
  "b": "sssa | efhh | stapc",
  "p": "3 Rose Wynd",
  "d": "2026-11-21",
  "r": "https://… full report link",
  "o": "owner first name",
  "pm": { "n": "Niamh Mckee", "ph": "01334 845 845", "bk": "https://… Microsoft Bookings page" },
  "s": [{ "i": "id", "t": "title", "w": "why", "a": 60, "on": true }],
  "y": [{ "i": "oven", "t": "Oven and extractor filter clean", "w": "…", "a": 85 }],
  "yn": "note under the yearly heading",
  "q": [{ "i": "id", "t": "title", "w": "why", "rv": "review snippet", "rf": "review source", "lk": "https://…", "lt": "Bathroom, page 6 of the full report" }],
  "inc": 150,
  "fr": 0.1,
  "x": "2026-12-21",
  "ps": "UUID4 — private key the payment link is left under"
}
```

`s` small jobs and `y` yearly work are priced including VAT. The arrangement fee is `fr` (10%) plus VAT. `inc` is the distributable income due before the work; leave it out if unknown. `x` is the expiry date.

## What the page sends

```json
{ "v": 1, "t": "token", "act": "approve | call", "s": ["ids"], "y": ["ids"], "q": ["ids"],
  "pay": "income | card | none", "auto": false, "shown": { "sub": 105, "fee": 12.6, "total": 117.6 }, "at": "ISO time" }
```

`auto: true` is the owner's standing permission to arrange small jobs without asking.

## Hosting

GitHub Pages from `main` / root, custom domain in `CNAME`. DNS (Skystra): `CNAME owners → shortstayfamily.github.io`, plus the `_github-pages-challenge-ShortStayFamily` TXT record for domain verification. Content Security Policy allows scripts and styles from this site only, and network calls only to `hooks.zapier.com`.

## Repair form — `/repair/`

<https://owners.shortstay.family/repair/> (preview without sending: `/repair/#demo`)

Holiday guests and owners report a repair. Optional link parts: `?b=sssa|efhh` (brand, default Short Stay Family), `?a=` address, `?pc=` postcode, `?r=guest|owner`. **Student tenants** use the St Andrews Property Co website form (https://standrewsproperty.co.uk/maintenance-request/, "Report an issue" on that site); `?b=stapc` or `?r=tenant` redirects there.

- The form POSTs (`text/plain` JSON, `kind: "repair"`) to the Zapier workflow **"Family Suite — repair requests"**, which saves one JSON file in SharePoint › Property Management › Maintenance › Repair requests. It sends no emails; the page confirms receipt itself.
- The Family Suite reads that folder, matches the property by postcode then address, and creates a **New** maintenance issue (source "Website repair form") that Harry triages. Requests it can't place wait at the top of the Maintenance board for a person to pick the property.
- Nothing is stored on this site except the reporter's own name, email and phone in their browser, to save retyping.
