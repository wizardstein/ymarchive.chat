# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

The app is scaffolded and builds cleanly. `YM_ARCHIVE_VIEWER_PLAN.md` remains the source of truth for product scope, the `.dat` byte-level format, and the full emoticon map — read it before making non-trivial changes. Stack: **Next.js 14 App Router + TypeScript + Tailwind CSS + `jszip`**, deployed as a static site.

## Layout

- `app/page.tsx` — landing page. Pure server component, imports the `components/landing/*` sections.
- `app/viewer/page.tsx` — client-only viewer. Owns all archive state; dynamically imports `lib/zipParser` so JSZip stays out of the initial bundle.
- `lib/decoder.ts` — XOR + block parser + text decode/strip. Pure, isomorphic, no DOM deps — safe to use from tests or a worker.
- `lib/zipParser.ts` — core profile assembler. Accepts either a zip (`parseArchive`) or a flat `{path, File}[]` from a folder upload (`parseFolderEntries`); both feed a shared `processEntries` via a `SourceEntry` abstraction. Groups by `<anything>/<user>/Archive/Messages/<peer>/*.dat` (the outer folder name is not significant), resolves avatars, dedupes overlapping message copies across snapshots, emits `ProcessingProgress`. Uses a 16-way concurrent pool for I/O and a throttled progress callback (100 ms minimum interval + stage-change flush) so large archives don't thrash React.
- `lib/cache.ts` — IndexedDB result cache. Stores the fully parsed `YMProfile[]` keyed by a SHA-256 fingerprint of the input file metadata (name/size/lastModified for zips; per-path size+lastModified for folder uploads). Schema-versioned; mismatches auto-invalidate. Best-effort — quota failures are swallowed.
- `lib/fsEntry.ts` — folder-upload plumbing: recursive `webkitGetAsEntry` walk for drag-drop, `webkitRelativePath` extraction for `<input webkitdirectory>`.
- `lib/emoticons.ts`, `lib/format.ts`, `lib/avatar.ts` — small pure helpers.
- `components/viewer/ChatView.tsx` — the one non-trivial UI component. Filter state + windowed rendering live here (see Performance Notes).

## Architectural Invariant: 100% Client-Side

The entire application must run in the browser. **Nothing the user uploads may touch a server.** This is not just a preference — it's the product's primary trust claim (see "Privacy statement" in the plan) and is explicitly advertised to users, including a suggestion that they verify it via the browser Network tab.

Practical consequences when writing code:
- No API routes, no server actions that receive user data, no server-side file parsing, no analytics that transmit message content.
- Zip parsing, `.dat` decoding, and avatar extraction all happen in the browser via `jszip` and typed arrays.
- Safe to deploy as a pure static export (Vercel/Netlify/GitHub Pages).

## Core Decoding Logic (non-obvious)

The `.dat` archive format and its decryption are not documented outside the plan — reference `YM_ARCHIVE_VIEWER_PLAN.md` for the full byte-level spec. Key gotchas a future Claude will hit:

- **Block layout**: each `.dat` is a stream of `[16-byte header][msgLength bytes][4-byte end marker]` blocks. Header is 4× little-endian int32: `timestamp`, unknown (ignore), `direction` (0 = sent by local user, non-zero = received), `msgLength`.
- **XOR key is the username**: decrypt with `decrypted[i] = encrypted[i] XOR username[i % username.length]`. The username is inferred from the folder path — specifically the segment immediately above `Archive/`. The outer wrapper folder can be named anything (`Profiles`, `profiles1`, `backup-2007`), so the path regex deliberately does NOT require a literal `Profiles/`.
- **Text encoding fallback**: try UTF-8 first; if decoding produces replacement chars (U+FFFD), re-decode as latin-1. Romanian/Eastern European archives from the 2000s are commonly latin-1.
- **Post-decryption stripping order matters**: ANSI escapes `\x1b\[[^m]*m`, then `<font[^>]*>` and `</font>`, then any remaining `<[^>]+>`, then empty lines. Silently skip blocks that end up empty.
- **Emoticon regex**: entries like `:)` contain regex metacharacters — always escape before building a RegExp, and sort keys longest-first so `:))` matches before `:)`.
- **Buzz**: the literal text `buzz` in a message means YM's buzz feature — render it as a special indicator, not a regular message.
- **Multiple profiles, multiple snapshots**: an upload can contain several sibling profile folders (enumerate + switch in the sidebar) AND the same user may appear across multiple top-level folders (e.g. `profiles1` and `profiles2` both containing `adelin/Archive/...`). Profiles are keyed by username, not by outer folder — messages from all occurrences are merged into one profile, then deduped by `(timestamp, text, isLocal)` after chronological sort.
- **Avatars**: parse `My Icons/Index.ini` (INI-style, paths are Windows-absolute — extract just the basename), then load the referenced PNGs from the zip as ArrayBuffer → base64 data URL. `iconindex.dat` is partially obfuscated and can be ignored for v1.

## Performance Notes

**Archive ingestion** (`lib/zipParser.ts`):
- Reads `.dat` files in a 16-way concurrent pool. The biggest browser-side cost is per-call overhead of `File.arrayBuffer()` (or JSZip's `async("uint8array")`) — serialized it was ~20 files/sec on large archives; parallel it handles hundreds/sec.
- Progress callback is throttled to 100 ms minimum interval with stage-change/terminal-state flush, so React doesn't re-render thousands of times during the decode loop.
- ETA is computed inline from rolling `filesDone / elapsed` and surfaced via `ratePerSec` + `etaSeconds` on the `ProcessingProgress`.
- Parsed `YMProfile[]` is written to IndexedDB keyed by the input fingerprint; the same archive re-opened is an instant cache hit (emits `{stage: "ready", fromCache: true}`).

**Message rendering** (`components/viewer/ChatView.tsx`):
1. Renders at most `WINDOW_SIZE` (400) messages at a time, anchored to the end of the conversation, with an IntersectionObserver sentinel that loads an earlier window when the user scrolls up.
2. Wraps every bubble in `content-visibility: auto` with a `contain-intrinsic-size` hint so off-screen bubbles skip layout/paint.
3. When any filter is active (search / date range), windowing is disabled and all matches render — matches are typically few.

If you change the message list, preserve both mechanisms — dropping either makes large archives janky.

## Commands

- `npm run dev` — Next.js dev server.
- `npm run build` — production build. The root and picker routes prerender statically; `/api/feedback` is a serverless route.
- `npm run typecheck` — `tsc --noEmit`.
- `npm run lint` — `next lint`.
- `npx tsx scripts/smoke-decoder.ts` — round-trip sanity check for `lib/decoder.ts` (builds synthetic XOR-encrypted blocks, decodes them, asserts text + direction + sender). Fast — run it any time you touch `lib/decoder.ts`.
- `npx tsx scripts/smoke-parser.ts` — exercises `parseFolderEntries` with synthetic `profiles1/`+`profiles2/` inputs: confirms the outer folder name is ignored, overlapping snapshots are deduplicated, and avatars resolve via `Index.ini`. Run when touching `lib/zipParser.ts`.

## Feedback mail relay

`app/api/feedback/route.ts` POSTs to Resend so the destination email never ships to the client. Required env vars (see `.env.example`):

- `RESEND_API_KEY` — from resend.com
- `FEEDBACK_TO_EMAIL` — recipient address (server-only; never appears in the browser bundle or in any `href`)
- `FEEDBACK_FROM_EMAIL` — verified sender. `onboarding@resend.dev` works for dev but only delivers to the Resend account owner; production should use a verified custom domain.

If any of the three are unset, the route returns HTTP 503 and the feedback page surfaces a friendly "isn't configured yet" error with a fallback to the Buy Me a Coffee message flow — no half-broken silent failure.

## Session persistence

`lib/session.ts` saves `{fingerprint, pickedIdx, activePeer, label, profileCount}` in `localStorage` as the user navigates. On `/viewer` mount, the page reads that blob and does `cacheGet(fingerprint)` — if the parsed archive is still in IndexedDB it restores the user straight back into the conversation they were reading. If the cache was evicted (quota, schema bump, browser-data clear) the stale session is cleared and the upload zone reappears cleanly.

Never store archive contents in `localStorage` — the 5-10 MB quota would break on any real archive. The heavy data stays in IndexedDB; `localStorage` holds only pointers + nav state.
