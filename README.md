# YM Archive Viewer

Upload your old Yahoo! Messenger `Profiles` folder (or zip of it) and browse every conversation you had, exactly as it was.

**100% client-side.** Your archive never leaves your browser — there's no backend, no upload, no database. It's a static Next.js site that does all the decoding in JavaScript on your device. You can verify it in the Network tab: zero outbound requests with your data.

Built for anyone who still has that folder in a drawer somewhere.

---

## Features

- **Works with any layout** — `Profiles/`, `profiles1/`, `profiles2/`, a naked `Archive/` folder, or a zip of any of the above. The parser anchors on Yahoo's own `Archive/Messages/<peer>/<date>-<user>.dat` structure, not on folder names.
- **Multi-profile support** — drop a parent folder containing several snapshots; each username becomes its own profile. Duplicate messages across overlapping snapshots are automatically deduplicated.
- **Cross-platform browsing** — the original client was Windows-only, but the viewer runs in any modern browser on Mac, Windows, Linux, ChromeOS.
- **Decoded emoticons** — classic Yahoo text emoticons render as emoji (`:)` → 😊, `:))` → 😄, `<3` → ❤️, `buzz` → a BUZZ bubble).
- **Timeline bar** — adaptive histogram (day / month / year buckets) across every conversation. Click any bar to jump to that period.
- **Sticky date header** — shows the currently-visible date as you scroll.
- **Full-text search & date-range filter** within a conversation.
- **Profile avatars** — old profile pictures are extracted from `My Icons/Index.ini` and rendered as base64 data URLs. Optional avatar-history gallery shows every picture you cycled through.
- **Instant reopen** — parsed archives are cached in IndexedDB, keyed by a fingerprint of the uploaded files' metadata. Re-opening the same archive is instant; your current profile + conversation are restored across tab closes.
- **Fast for big archives** — 16-way concurrent file reads, throttled progress callbacks, content-visibility windowing. A 4 000-file archive decodes in seconds.
- **Private feedback form** — optional serverless email relay so bug reports / feature requests reach you directly without your email ever touching the client bundle.

---

## Tech stack

- **Next.js 14** (App Router) — static routes + one serverless function for feedback
- **TypeScript** (strict)
- **Tailwind CSS**
- **jszip** — reads uploaded zip files in the browser
- **IndexedDB** — caches parsed profile data per-user
- **Resend** (optional) — transactional email for the `/feedback` route

No state management library, no UI kit. Intentionally small.

---

## Quick start

```bash
git clone https://github.com/<your-username>/ym-archive-viewer.git
cd ym-archive-viewer
npm install
npm run dev
```

Open <http://localhost:3000>.

The app works fully without any environment variables. You only need to configure env vars if you want the `/feedback` form to email you (see below).

### Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `next lint` |
| `npx tsx scripts/smoke-decoder.ts` | Round-trip sanity check for the XOR decoder |
| `npx tsx scripts/smoke-parser.ts` | Exercises the folder parser against synthetic layouts (`profiles1/`, `profiles2/`, and a bare `Archive/`) |

---

## Deploying to Vercel

This project is a stock Next.js app — Vercel auto-detects everything.

1. Push the repo to GitHub.
2. In Vercel, **New Project → Import** the repo.
3. Click **Deploy**.

That's it. The site works. Three environment variables are *optional*; they only matter if you want the feedback form to send emails. Keep reading if you do.

---

## Configuring the feedback form (optional)

The `/feedback` page POSTs to `/api/feedback`, a small serverless function that relays the message via [Resend](https://resend.com) so your email address never lives in the client bundle.

If you don't configure it, the API cleanly returns HTTP 503 and the feedback UI surfaces a friendly "not configured yet" note with a Buy Me a Coffee fallback. The rest of the site works exactly the same.

### Three environment variables

Set these in **Vercel → Project Settings → Environment Variables** (don't commit real values — only the template in `.env.example` is checked in).

| Variable | Purpose | Example |
|---|---|---|
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com/api-keys). Free tier is 100 emails/day — way more than enough. | `re_...` |
| `FEEDBACK_TO_EMAIL` | Where feedback messages are delivered. Your inbox. | `you+feedback@gmail.com` |
| `FEEDBACK_FROM_EMAIL` | Who the email *appears* to be sent from. See below. | `onboarding@resend.dev` |

### What's `FEEDBACK_FROM_EMAIL` and why is `onboarding@resend.dev` the answer?

Every email needs a `From` address, and mail servers require the sending service (Resend) to be allowed to send for that domain — otherwise Gmail, Outlook, etc. drop it as forged. You have two choices:

1. **`onboarding@resend.dev`** — a sandbox sender Resend provides. **Works immediately, no DNS setup.** The catch: it will only deliver to the email address you used to sign up for Resend. Since you're sending feedback to yourself, this is exactly what you want — and it's the easiest possible setup.
2. **Your own verified domain** (e.g. `feedback@ymviewer.example`). Requires adding a few DNS records in Resend's dashboard. Only necessary if you want to send to addresses other than your own (e.g. replying to people) — not relevant for a simple feedback form.

Start with `onboarding@resend.dev`. Upgrade to a custom domain later if you ever need to.

### Local development

Copy `.env.example` → `.env.local` and fill in real values. `.env.local` is already gitignored.

```bash
cp .env.example .env.local
# edit .env.local
npm run dev
```

---

## How it works

The parser implements Yahoo Messenger's undocumented `.dat` archive format:

- Each file is a stream of blocks: **16-byte header** (`timestamp`, `direction`, `msgLength` as little-endian int32s) + **message bytes** + 4-byte end marker.
- Message bytes are XOR-encrypted with the local user's username as the repeating key.
- After decryption, ANSI escape sequences and `<font>` tags are stripped, text is decoded as UTF-8 (with a latin-1 fallback for older Eastern European installs).

See [`YM_ARCHIVE_VIEWER_PLAN.md`](./YM_ARCHIVE_VIEWER_PLAN.md) for the full byte-level spec and historical context.

### Project layout

```
app/
  page.tsx            Landing page
  viewer/page.tsx     The viewer — owns all archive state
  feedback/page.tsx   Feedback form
  api/feedback/       Serverless email relay (Resend)
components/
  landing/            Hero, TrustPillars, HowItWorks, FAQ
  viewer/             UploadZone, ProcessingState, ProfilePicker,
                      Sidebar, ChatView, TimelineBar, MessageBubble,
                      DonateBadge
lib/
  decoder.ts          XOR + block parser + text stripping
  zipParser.ts        SourceEntry abstraction, parallel pool,
                      cache check, fingerprinting
  cache.ts            IndexedDB wrapper
  session.ts          Tiny localStorage session pointer
  fsEntry.ts          webkitGetAsEntry + webkitdirectory helpers
  emoticons.ts        Emoticon → emoji map
  format.ts, avatar.ts, links.ts, types.ts
scripts/
  smoke-decoder.ts    Decoder round-trip test
  smoke-parser.ts     Folder parser tests (incl. Archive-only fallback)
```

---

## Privacy

- Nothing you upload is ever sent to a server. Zip parsing, XOR decryption, and avatar extraction all run in your browser via `jszip` and typed arrays.
- Decoded archives are cached in *your* browser's IndexedDB so re-opening is instant; that data never leaves your device.
- The `/feedback` route is the only endpoint that transmits anything. It sends only the text you typed into the form (plus the diagnostic info you chose to attach). Your archive is never involved.
- No cookies, no tracking, no analytics.

If you want to verify any of this, open your browser's Network tab while using the app. You should see zero outbound requests while browsing conversations.

---

## Fork it

This is a small, self-contained Next.js app — easy to fork and make your own. Things you'd typically change:

- `lib/links.ts` — Buy Me a Coffee URL.
- `FEEDBACK_TO_EMAIL` env var — your inbox.
- Landing-page copy in `components/landing/*`.

---

## License

MIT. See [`LICENSE`](./LICENSE).
