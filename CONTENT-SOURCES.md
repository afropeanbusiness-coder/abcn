# ABCN content research

Research snapshot: 21 September 2026.

This file separates **verified public information** from **new website positioning** so future editors can update the site without accidentally turning design copy into historical fact.

## Verified ABCN information

### Official public profile
- Name: **Afropean Business & Culture Network**
- Instagram: https://www.instagram.com/afropeanbusinessnetwork/
- Public profile description surfaced in search: “An inclusive platform dedicated to elevating Afropean diaspora communities.”
- Search snapshot: approximately **7,604 followers** and **71 following**.

The follower number is a point-in-time public snapshot and should not be treated as permanently current.

## Founder / public ecosystem context

### Harmonie Essome
- Instagram: https://www.instagram.com/harmonieessome/
- Public profile language connects her work with technology, entrepreneurship and Afro-European networks.
- Public professional posts describe cross-border ecosystem work involving Frankfurt, Germany, Cameroon and wider Europe.
- A 2026 post around International Business Week Yaoundé / Salon PROMOTE described a focus on connecting ecosystems, technology leaders, institutions and entrepreneurs to build partnerships between Cameroon, Germany and Europe:
  https://www.linkedin.com/posts/harmonieessome_salonpromote2026-internationalbusinessweek-activity-7464948450644713473-6tig
- A Frankfurt AfroCommunity post described work with Ubuntu Haus and community partners toward a space supporting participation, economic and educational opportunity, personal development, business, education and social engagement:
  https://de.linkedin.com/posts/harmonieessome_afrocommunity-frankfurt-projekt-activity-7401175784326864897-8O9D
- A FLOW Conference post discusses navigating business in Germany and internationally, German market entry, relationship building, African identity/culture and Ubuntu:
  https://www.linkedin.com/posts/harmonieessome_findyourflow-flowconference-womeninbusiness-activity-7459512775732719616-M8FK

## Website positioning introduced by this build

The following phrases and structures are original editorial positioning for the new ABCN website, not claims copied from an existing ABCN programme list:

- “African roots. European horizons.”
- The Business / Culture / Community lens model
- Business circles
- Cultural salons
- Cross-border rooms
- Member stories
- “Not caught between worlds. Fluent in more than one.”

These are intentionally framed as a design and growth direction rather than as verified existing programmes.

## Logo / identity note

A reliable downloadable original ABCN logo file could not be retrieved from public search because the accessible Instagram search result exposes profile text but not the original profile artwork at usable quality.

The repository therefore includes an **original interim ABCN mark** for favicon/identity use. It should not be described as the historic or official ABCN logo. When the original brand asset is supplied, replace `app/icon.svg` and, if desired, the typography-based navbar mark.

## Photography

The site uses remote Unsplash photography selected for business, culture and community context, with visible photographer credits on the story panels.

- Vitaly Gariev / Unsplash
- Dwayne Joe / Unsplash
- Ben Iwara / Unsplash

For production longevity, these can later be replaced with ABCN-owned event photography.


## FIALI event programme - supplied source

Source: `Afro-European Female Innovators Initiative.pdf`, supplied for the September 2026 website update.

Verified programme details used in the Events section:
- **Female Innovation Afropean Leadership Initiative (FIALI)** - Frankfurt 2026.
- Led by **Harmonie Essome** and positioned around empowering international female founders in Frankfurt.
- Two-stage pilot: **Female Innovation Growth Lab** followed by the **Female Founder Business Networking Summit**.
- Target cohort: **10-15 international female founders** in Frankfurt / Rhine-Main, with a particular Afropean / immigrant diaspora focus, scalable business models and strong interest in AI and digitalization.
- Stage 1 covers business-model development, leadership and positioning, AI and digitalization, and go-to-market strategy, culminating in an individual 90-day growth plan.
- Stage 2 covers founder pitches, business matchmaking, expert keynotes and AI / innovation insights.
- A **€1,000 Startup Innovation Grand Prize** is awarded to 1 person (eligible early-stage founder).
- Partner marks shown in the supplied deck include ABCN, DIVOC Rising, Black Women in Tech DACH, and Kompass Frankfurt. (EquiNet appeared in the deck but has been removed from the website and event pages at the organiser's request.)

### Date / venue caution
The deck consistently identifies the programme as **Frankfurt 2026** but does not provide a trustworthy confirmed event date or venue. A slide labelled “June 23, 2035” conflicts with the rest of the document and is treated as an unverified template artefact, not a public event date. The website therefore says **“Dates to be announced”** until the CMS is updated with confirmed logistics.

### FIALI visual identity
The website event theme is sampled from the supplied deck:
- Deep green: `#0F4C38`
- Forest / teal: `#1F684F`
- Mid green: `#318E6C`
- Accent mint-green: `#58AC8C`
- Light mint: `#A7DEC8`
- Near-white: `#F0F5F3`

Partner/logo assets should be treated as programme-provided marks from the supplied document.
---

## Messaging architecture (added in the Phase 0-4 revision)

ABCN is an **inclusive** platform. FIALI is a **women-only programme inside it**.
The site must hold that distinction on both axes - words and pictures.

| Surface | Audience | Imagery |
| --- | --- | --- |
| `/` hero, About, Join, footer | Everyone: founders, professionals, creatives, organisations | Mixed-gender, visibly Afropean, ABCN-owned |
| `/` FIALI spotlight, `/events/fiali-frankfurt-2026` | International female founders | FIALI programme photography |

**Rule: do not use `/public/assets/fiali/*` on a brand surface.** That boundary is
what previously failed - FIALI assets became the brand's imagery, so an inclusive
platform read as a women's network to anyone who landed on the homepage.

## Outstanding: brand photography

Every photograph of people in this repository is of women, and two of the brand
images are weak on their own terms:

- `assets/abcn/ecosystem-network.png` - **not a photograph.** A flat green
  gradient with circles. It is currently marked decorative (`alt=""`) and given
  an emblem overlay so it reads as an intentional graphic panel rather than a
  broken image. It should be replaced with a real photograph.
- `assets/abcn/collaborators.png` - generic stock-style image with no visible
  Afropean context; appears to be AI-generated.

**Needed:** ABCN-owned event photography, mixed-gender, visibly Afropean, ideally
from real ABCN gatherings. Until it exists the homepage cannot fully deliver the
inclusive positioning above, no matter what the copy says.

## Outstanding: facts the site cannot state yet

These are genuinely unknown from any supplied source. Do not guess them:

- FIALI exact dates and venue (the deck's "June 23, 2035" is a template artefact).
- Whether FIALI has a participation fee.
- The working language of the programme (English, German, or both).
- ABCN-level partner organisations. The hero previously claimed "In Strategic
  Alliance: Mountain Hub / SoftXcloud GmbH / CITS 2026 / Kompass Frankfurt /
  BWIT DACH". None of these is evidenced as an ABCN partnership in any supplied
  document, so the strip was removed. Restore it only with confirmed partners.

The FIALI FAQ in `app/events/[slug]/page.tsx` answers only what the deck supports
and carries a comment listing the four questions above as deliberately unanswered.

## Outstanding: testimonials

`components/Voices.tsx` renders the member-voices section but ships with an empty
list, so nothing appears until real, attributable quotes are added. Testimonials
were not invented. This is the single highest-value addition left on the site.
