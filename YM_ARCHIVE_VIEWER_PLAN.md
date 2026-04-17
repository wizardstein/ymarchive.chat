# Yahoo! Messenger Archive Viewer — Product Plan

## What We're Building

A web app where anyone can upload their old Yahoo! Messenger `Profiles.zip` and instantly browse their archived conversations in a beautiful, nostalgic UI. **100% client-side — no backend, no server, no database.** Files never leave the user's browser.

---

## Architecture

**Fully static, zero backend.** Everything runs in the browser:
- User uploads zip → parsed in-browser with JSZip
- `.dat` files decoded in-browser using the XOR algorithm (key = username)
- All rendering is pure JS — conversations never touch a server
- Deploy as a static site on Vercel/Netlify/GitHub Pages for free

---

## Pages

### 1. Landing Page (`/`)

- **Hero section**: nostalgic Yahoo! Messenger aesthetic (purple gradient, retro logo font), tagline like *"Your 2007 conversations, back from the dead"*
- **Animated demo**: show the chat UI with sample/fake conversations so people understand what they're getting
- **Three trust pillars** (prominent, above the fold):
  - 🔒 **Completely private** — your files never leave your device, zero server uploads
  - 💸 **Free forever** — static site, no accounts, no paywalls
  - 🗑️ **Nothing stored** — close the tab and it's all gone
- **Single CTA**: "Upload your archive" button
- **How it works**: 3-step visual (Upload zip → Decoded in your browser → Browse your chats)
- **FAQ section**:
  - What versions of Yahoo! Messenger are supported? (2003–2012, `.dat` archive format)
  - Where do I find my archive files? (default path: `C:\Program Files\Yahoo!\Messenger\Profiles\`)
  - Is this really private? (yes, explain it technically — no network requests are made with your data)
  - What if my archive has multiple profiles?
  - Why does my archive have garbled filenames on Windows? (long path issue)

### 2. Viewer App (`/viewer`)

- **Drag-and-drop upload zone** with a fallback file picker button
- **Processing state** with progress feedback: Unzipping → Detecting profiles → Decoding messages → Ready
- **Three-panel UI**:
  - Left sidebar top: list of user accounts found in the archive (with avatar from My Icons if available)
  - Left sidebar bottom: list of conversations for the selected account, sorted by message count
  - Main area: chat view with message bubbles

---

## UI / Chat View Features

- Messages displayed as chat bubbles: local user on the right (purple), contacts on the left (grey)
- Timestamps on each message, date dividers between days
- **Emoticon rendering**: text emoticons converted to emoji inline (full map below)
- **Profile avatars**: use images from `My Icons/` folder as the user's avatar in the sidebar and chat bubbles. For contacts (peer), fall back to colored initials avatar
- **Avatar history**: optionally show a small gallery of all profile pictures the user had over time (from `My Icons/`)
- **"Image sent" indicator**: if a file transfer event is detected in the message data, show a subtle placeholder like `📎 [image shared]` since the actual files aren't in the archive
- Date range filter (from/to date pickers)
- Full-text search within a conversation
- Stats bar: total messages shown, date range of conversation

---

## Core Decoding Logic

### Zip Structure Expected
```
Profiles/
  {username}/
    Archive/
      Messages/
        {peer_username}/
          {YYYYMMDD}-{username}.dat   ← one file per day per contact
    My Icons/
      Index.ini                        ← list of profile pictures used
      *.png                            ← actual profile picture files
    iconindex.dat                      ← icon history (binary)
```

Multiple profile folders can exist at the same level — the app should handle all of them.

### .dat File Format

Each `.dat` file is a sequence of binary blocks:

```
[16-byte header][N bytes message data][4-byte end marker]
```

**Header** (4× little-endian int32):
| Field | Type | Meaning |
|-------|------|---------|
| timestamp | int32 LE | Unix timestamp of the message |
| field2 | int32 LE | Unknown, ignore |
| direction | int32 LE | `0` = sent by local user, non-zero = received from peer |
| msgLength | int32 LE | Length of the following message bytes |

**Message decryption** (XOR cipher):
```
key = username (the local profile name, e.g. "lavinia_selena")
key is repeated/truncated to match msgLength
decrypted[i] = encrypted[i] XOR key[i % key.length]
```

**Post-decryption cleanup** — strip these from message text:
- ANSI escape sequences: `/\x1b\[[^m]*m/g`
- Yahoo font tags: `/<font[^>]*>/g` and `/<\/font>/g`
- Any remaining HTML tags: `/<[^>]+>/g`
- Empty lines left after stripping

### Emoticon → Emoji Map

```js
const EMOTICONS = {
  ':)': '😊', ':-)': '😊', '=)': '😊',
  ':D': '😄', ':-D': '😄', '=D': '😄',
  ':(': '😞', ':-(': '😞',
  ';)': '😉', ';-)': '😉',
  ':P': '😛', ':-P': '😛', '=P': '😛',
  ':O': '😮', ':-O': '😮', ':o': '😮',
  ':|': '😐', ':-|': '😐',
  ':*': '😘', ':-*': '😘',
  ':/': '😕', ':-/': '😕',
  ':S': '😖', ':-S': '😖',
  ':@': '😤', ':-@': '😤',
  ':-&': '🤢',
  '>:(': '😠', '>:-(': '😠',
  '8)': '😎', '8-)': '😎',
  '<3': '❤️',
  ':))': '😄', ':)))': '😂', ':))))': '😂',
  ':-))': '😄', ':-)))': '😂',
  ':((': '😢', ':(((': '😭',
  ':-?': '🤔', ':-??': '🤔',
  '(*)': '⭐',
  '(e)': '📧',
  'buzz': '📳',
};
// Sort keys longest-first before replacing to avoid partial matches
```

**Important**: escape all emoticon strings before using in RegExp (`:)` contains `)` which is a regex special char).

### My Icons / Profile Avatars

`Index.ini` format:
```ini
[Icons]
Icon1=C:\...\My Icons\photo.png,4,-28977376
Icon2=C:\...\My Icons\other.png,4,840892519
```

- Parse `Index.ini` to get the list of icon filenames (extract just the filename from the full Windows path)
- Read the corresponding PNG files from the zip as ArrayBuffer → convert to base64 data URL for `<img src>`
- Use the last icon in the list as the "current" avatar
- `iconindex.dat` is a binary format (partially obfuscated) — can be ignored for v1; just use the last entry in Index.ini

---

## Tech Stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Zip parsing | `jszip` |
| Hosting | Vercel (free static) |
| Language | TypeScript |
| No backend | — |

---

## Suggested File Structure

```
/
├── app/
│   ├── page.tsx                  ← Landing page
│   ├── layout.tsx
│   └── viewer/
│       └── page.tsx              ← Upload + viewer app
├── components/
│   ├── landing/
│   │   ├── Hero.tsx
│   │   ├── TrustPillars.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── DemoPreview.tsx
│   │   └── FAQ.tsx
│   └── viewer/
│       ├── UploadZone.tsx        ← Drag & drop, triggers processing
│       ├── ProcessingState.tsx   ← Progress indicator
│       ├── Sidebar.tsx           ← Account + conversation list
│       ├── ChatView.tsx          ← Message bubbles, filters, search
│       └── MessageBubble.tsx
├── lib/
│   ├── decoder.ts                ← XOR decryption + block parser
│   ├── zipParser.ts              ← Zip structure walker, profile extractor
│   ├── emoticons.ts              ← Emoticon → emoji replacement
│   └── types.ts                  ← Shared TypeScript types
└── public/
    └── sample-data/              ← Fake sample conversation for demo
```

---

## TypeScript Types

```ts
interface YMProfile {
  username: string;
  avatarUrl: string | null;       // base64 data URL from My Icons
  avatarHistory: string[];        // all avatars, oldest first
  conversations: YMConversation[];
}

interface YMConversation {
  peer: string;
  messages: YMMessage[];
}

interface YMMessage {
  timestamp: number;              // Unix timestamp
  sender: string;                 // username of sender
  text: string;                   // cleaned, decoded text
  isLocal: boolean;               // true if sent by the local profile user
}
```

---

## Processing Pipeline (in `zipParser.ts`)

```
1. Accept File (zip) from user
2. JSZip.loadAsync(file)
3. Find all folders matching */Archive/Messages/*/**.dat
4. Infer username from folder path: Profiles/{username}/Archive/...
5. For each .dat file:
   a. Read as Uint8Array
   b. Parse blocks: while bytes remain, read 16-byte header, extract fields
   c. XOR-decrypt message bytes using username as key
   d. Decode as UTF-8 (with latin-1 fallback for older Windows archives)
   e. Strip ANSI/HTML formatting
   f. Append to conversation
6. For each profile, find My Icons/Index.ini → parse → load PNGs as base64
7. Return YMProfile[]
```

---

## Privacy & Legal Copy

### Hero tagline options
- *"Your 2007 conversations, back from the dead"*
- *"Time travel to your teenage years"*
- *"Because some conversations deserve to be remembered"*

### Privacy statement (use verbatim or adapt)
> Your archive is processed entirely in your browser using JavaScript. No files are uploaded to any server — ever. No conversations are stored anywhere. No account is required. Close the tab and everything disappears instantly. We literally cannot see your messages: the code runs on your device, not ours. You can verify this by checking the Network tab in your browser's developer tools — you'll see zero outgoing requests with your data.

### Trust signals to show in UI
- "🔒 Processed locally — never uploaded"
- Show a live network request counter (always 0) as a fun trust indicator
- Link to the open-source GitHub repo
- "No cookies. No tracking. No accounts."

---

## Notes for Implementation

- **Performance**: for large archives (some conversations have 4000+ messages), render messages in chunks or use virtual scrolling. Don't render 4000 DOM nodes at once.
- **Encoding**: Romanian/Eastern European text from 2007 may be latin-1 encoded, not UTF-8. Try UTF-8 first, fall back to `latin-1` if decoding produces replacement characters.
- **Multiple profiles**: the zip may contain multiple profile folders (e.g. `lavinia_selena`, `lil_saint281`, `abelcavasi`). Show all of them in the sidebar with a clear account switcher.
- **Date parsing**: timestamps in `.dat` files are Unix timestamps (seconds since epoch), little-endian int32. Some files from older YM versions used a different epoch — if dates look wrong (e.g. year 1970), try adding a known offset.
- **Empty messages**: some decoded blocks produce empty strings after stripping — skip these silently.
- **Buzz**: YM's "buzz" feature shows as the literal text `buzz` in the archive. Render it as a special indicator (📳 buzz) rather than a normal message.
