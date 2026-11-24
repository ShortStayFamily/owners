# owners

Owner choice pages for **owners.shortstay.family** — static page code only, no owner data.

After a condition report, the Family Suite emails the owner a link to this page. The owner ticks the small jobs and yearly work they want, says which bigger jobs we should get quotes for, picks how to pay, and approves.

Preview: <https://owners.shortstay.family/#demo>

## How it works

- **Nothing about any owner or property is stored here.** The menu travels in the link's `#` part (it never reaches a web server). `#m=` is base64url JSON; `#z=` is the same JSON deflate-raw compressed.
- The owner's choices are POSTed (as `text/plain` JSON) to the Zapier catch hook named in the menu. Only `https://hooks.zapier.com/hooks/catch/…` addresses are accepted.
- The workflow **"Family Suite — owner choices"** looks up `menu-<token>.json` that the Suite saved in SharePoint and works from *those* prices and items. Editing the link therefore changes nothing we act on. The hook is idempotent per token: the latest submission wins, and only one invoice is raised.
- When the owner's income won't cover the total (or they choose to pay now), the workflow queues a Xero invoice on the Ancillary Services branding theme, which carries the Stripe "Pay now" link — the same mechanism as appraisal invoices. No card surcharge.

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
  "x": "2026-12-21"
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
