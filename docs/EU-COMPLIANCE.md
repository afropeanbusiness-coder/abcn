# EU / German technical compliance

How this site meets the three requirements raised by the client — Google EU
indexing, GDPR, and Core Web Vitals — what is done, and what still needs a
decision or information from ABCN.

---

## 1. Google EU indexing & technical SEO

### Localized URLs, not a language toggle

German and English are separate, crawlable URLs with real German slugs:

| Internal route   | English                 | German                             |
| ---------------- | ----------------------- | ---------------------------------- |
| `/`              | `/`                     | `/de`                              |
| `/about`         | `/about`                | `/de/ueber-uns`                    |
| `/events`        | `/events`               | `/de/veranstaltungen`              |
| `/events/[slug]` | `/events/<slug>`        | `/de/veranstaltungen/<slug>`       |
| `/privacy`       | `/privacy`              | `/de/datenschutz`                  |
| `/impressum`     | `/impressum`            | `/de/impressum`                    |

Defined once in [`i18n/routing.ts`](../i18n/routing.ts). Canonicals, hreflang
and the sitemap are all derived from that map by [`lib/seo.ts`](../lib/seo.ts),
so a German slug cannot drift out of sync with what actually resolves.

Link with the helpers from `@/i18n/routing`, never `next/link`, and pass the
**internal** route — next-intl writes the localized URL for the active locale:

```tsx
import { Link } from "@/i18n/routing";

<Link href="/events">…</Link>                                    // → /de/veranstaltungen
<Link href={{ pathname: "/events/[slug]", params: { slug } }}>…</Link>
```

Old English paths under `/de` (`/de/events`) redirect to the German slug
rather than serving duplicate content.

### Per-page metadata

Every route exports `generateMetadata` with `alternatesFor(...)`, producing a
self-referencing canonical plus `en` / `de` / `x-default` hreflang.

**This matters more than it looks.** A page with no metadata export inherits the
root layout's — which previously canonicalised `/de/veranstaltungen` and
`/about` to the homepage, telling Google they were duplicates of `/`. Any new
route must export its own `generateMetadata`.

### Structured data

Built in [`lib/structured-data.ts`](../lib/structured-data.ts), rendered
server-side via [`components/JsonLd.tsx`](../components/JsonLd.tsx):

- `Organization` + `WebSite` on every page, with `areaServed` Germany/Europe
- `BreadcrumbList` on event pages
- `Event` on event detail pages — **only when the event has a start date**

> **Event rich results are gated on `start_at`.** Google requires `name`,
> `startDate` and `location`; emitting an Event without a date produces a Search
> Console error instead of a rich result. FIALI currently has `start_at = NULL`
> in the CMS ("dates to be announced"), so no Event markup is emitted yet.
> **Set the date in `/admin/events` and the markup appears automatically** —
> verified working end to end.

### Sitemap

[`app/sitemap.ts`](../app/sitemap.ts) reads published events from the CMS and
emits both locale variants with sitemap-level hreflang. Revalidates hourly, so
an event published in the admin appears to search engines without a redeploy.

### Still to do

- Verify the property in **Google Search Console** and submit the sitemap. Set
  `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` to the verification token.
- Set `NEXT_PUBLIC_SITE_URL` to the live domain. Everything above derives from
  it; the fallback is `https://abcn.network`.
- Add an Open Graph share image (1200×630). There is none, so link previews on
  LinkedIn/WhatsApp fall back to the logo.

---

## 2. GDPR / EU compliance

### No third-party requests

The site loads **no** analytics, tag manager, maps, embeds or marketing pixels.
Fonts are self-hosted through `next/font`, so no request reaches
`fonts.googleapis.com` — that request is what the Munich Regional Court ruled
against in 2022 (Az. 3 O 17493/20), and it is the most common way an otherwise
clean German site leaks visitor IPs to a third country.

**Keep it that way.** Anything new that calls a third party must be wrapped in
`ConsentGate` (below).

### Consent

[`lib/consent.ts`](../lib/consent.ts) + [`components/CookieBanner.tsx`](../components/CookieBanner.tsx):

- Categories: `necessary` (always on), `analytics`, `marketing`
- Optional categories default to **off**; nothing is pre-ticked
- **Accept all** and **Reject all** share one style class on the first layer, so
  neither can drift into being more prominent — that equivalence is the thing
  German supervisory authorities issue findings over
- No bare "X" or "Got it" dismissal — closing a banner is not consent
- Decision stored first-party (`abcn_consent`, SameSite=Lax, Secure) with a
  timestamp and version, which is the accountability record Art. 7(1) expects
- Expires after 180 days, and a `CONSENT_VERSION` bump re-asks
- Withdrawable any time from the footer — as easy as giving it (Art. 7(3))
- Silence means denied: an absent, malformed or expired record grants nothing

To add anything that needs consent:

```tsx
import ConsentGate from "@/components/ConsentGate";

<ConsentGate category="analytics">
  <Script src="https://…" />
</ConsentGate>
```

Children are not rendered until consent is granted, so the script is never
requested and no third-party cookie or IP transfer occurs. They unmount again
the moment consent is withdrawn.

### Transport & headers

Set in [`next.config.mjs`](../next.config.mjs): HSTS (2 years, subdomains,
preload), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy:
strict-origin-when-cross-origin`, and a `Permissions-Policy` denying camera,
microphone, geolocation and FLoC.

HSTS is what makes "the site uses SSL" true in practice — without it, a first
visit to `http://` is answered in the clear before any redirect.

### Data residency

- Database: **Neon, `eu-central-1` (Frankfurt)** — already the case
- Hosting/functions: pinned to **`fra1` (Frankfurt)** in
  [`vercel.json`](../vercel.json)
- Image optimization and fonts are served from the app itself, not a third party

### What the notice now states factually

[`lib/privacy-facts.ts`](../lib/privacy-facts.ts) holds the verifiable inventory
— cookies, application-form fields, named processors, what the site does *not*
load, and the configured security measures. Both language versions of the
notice render from it via
[`components/PrivacyDetails.tsx`](../components/PrivacyDetails.tsx), so the
German and English texts cannot drift apart or describe different systems.

**Keep it in sync.** Adding a cookie, a form field or a third-party request
means updating that file in the same change — the notice is only accurate
because those lists are.

Of note, the notice now discloses that event listings and application
submissions go from the visitor's browser **directly** to the Neon database
interface in Frankfurt, so that service receives the visitor's IP address. That
is a real data flow and it was previously undocumented.

### Still to do — needs ABCN

1. **Fill the Impressum placeholders** in [`lib/legal.ts`](../lib/legal.ts):
   registered entity name and legal form, address, authorised representative,
   contact email and phone, register court and number, VAT ID, editorially
   responsible person. A German Impressum without these breaches §5 DDG and is
   a standard *Abmahnung* target. **This is a launch blocker.**
2. **Retention periods** — how long FIALI application data and server logs are
   kept. Currently placeholders in the privacy notice.
3. **Sign the processor agreements (AVV / DPA)** with Vercel and Neon, and keep
   them on file. Both offer standard GDPR DPAs.
4. **Record of processing activities (Verzeichnis nach Art. 30)** — a short
   internal document listing the application form and server logs.
5. **Final legal review** of the privacy notice and Impressum by a German data
   protection lawyer before public launch.

---

## 3. Core Web Vitals & speed

### Images

All bundled imagery renders through [`components/Img.tsx`](../components/Img.tsx),
wrapping `next/image`:

- AVIF with WebP fallback, sized per breakpoint via `sizes`
- Intrinsic dimensions from the generated
  [`lib/image-sizes.ts`](../lib/image-sizes.ts), so space is reserved before the
  file arrives — this is what holds CLS at zero
- `priority` on the LCP image of each page only
- Everything else lazy-loads
- CMS rows carrying an arbitrary remote URL fall back to a plain lazy `<img>`,
  so an editor pasting a link cannot break a page

Measured on the FIALI hero (`female-founders-summit.jpg`):

| | Before | After |
| --- | --- | --- |
| Source file | 4.26 MB JPEG (4938×3292) | 423 KB JPEG (2400×1600) |
| Delivered at 640px | 4.26 MB | **18 KB AVIF** |
| Delivered at 1200px | 4.26 MB | **47 KB AVIF** |

The two event hero/card images were CSS `background-image`, which no browser can
preload, resize or lazy-load. They are now real images with `fill`, keeping the
same visual result via `object-fit: cover` while becoming optimizable and
carrying alt text.

After adding or replacing an asset in `public/assets`:

```bash
npm run images:manifest
```

### Still to do

- Run PageSpeed Insights against the deployed URL with German mobile throttling
  and record the numbers before launch.

---

## Launch checklist

- [ ] `NEXT_PUBLIC_SITE_URL` set to the live domain
- [ ] Impressum and privacy placeholders filled (`lib/legal.ts`)
- [ ] Retention periods confirmed
- [ ] AVV/DPA signed with Vercel and Neon
- [ ] German legal review of Impressum + Datenschutzerklärung
- [ ] Search Console verified, sitemap submitted, German targeting confirmed
- [ ] `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` set
- [ ] Open Graph share image added
- [ ] Event `start_at` set in the CMS so Event rich results activate
- [ ] PageSpeed Insights run on the live domain (German mobile)
