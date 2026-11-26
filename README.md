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

Switched off 25 Nov 2026: the repair route is for student (PRT) tenants only, and they use the St Andrews Property Co website form, https://standrewsproperty.co.uk/maintenance-request/ ("Report an issue" on that site). `/repair/` now just redirects there. The Zapier workflow "Family Suite — repair requests" is disabled.

## Viewing booking page — `/view/`

St Andrews Property Co viewing invites (sent from lettings@ by the Zapier workflow **"Family Suite — viewings"**) carry a button per 15-minute time. Each opens `/view/#m=…&s=HH:MM` (or `&a=cancel` / `&a=decline`). Nothing is booked until the applicant presses the button on the page, so email link scanners can't book.

- `#m=` is base64url JSON: `{v:1, r: round id (VR-…), t: this group's 24-character token, h: hook, p: property, a: address, d: date, s: [start times], c: booking closes (ISO), n: first name, w: where to meet}`.
- The press POSTs `{kind:"view-book"|"view-cancel", r, t, slot, why, ps}` as `text/plain` JSON to the hook. `ps` is a one-off UUID4 made on the page; the workflow gives out times first come, first served (with SharePoint If-Match, so two presses can't take the same time) and puts the outcome under `ps` in Storage by Zapier, which the page polls to say "You're booked for 4:15pm" or "4pm had just gone, so you've got 4:15pm".
- Preview: <https://owners.shortstay.family/view/#demo>

## Register interest page — `/interest/`

When a property on the Family Suite's Coming free list matches someone on the student waiting list, lettings@ emails them automatically (at most once a week each) with **I'm interested** and **Not for us** buttons. Each opens `/interest/#m=…` (with `&a=not` for the second). Nothing is sent until they press the button on the page, so email link scanners can't register anything.

- `#m=` is base64url JSON: `{v:1, t: token, h: hook, p: property, a: area, b: bedrooms, r: rent text, f: free from (YYYY-MM-DD), n: first name}`.
- The press POSTs `{kind:"student-interest", t, act:"yes"|"not", why:"far"|"dear"|"found"|"other", note, at}` as `text/plain` JSON to the Zapier workflow **"Family Suite — student interest"**, which saves it in SharePoint › Student Property Lettings › Viewings › Interest. The Suite matches the token to the person and property, records it on their waiting-list card and moves them up for that property.
- "I'm interested" says thank you and that we'll send the viewing link in due course.
- Preview: <https://owners.shortstay.family/interest/#demo> and `#demo&a=not`
