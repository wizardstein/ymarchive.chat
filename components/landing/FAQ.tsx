export const FAQS = [
  {
    q: "Which Yahoo! Messenger versions are supported?",
    a: "Any version that wrote the classic .dat archive format — roughly 2003 through 2012. If your folder has a Messenger username subfolder with an Archive/Messages/ inside, you're good.",
  },
  {
    q: "Where did these files originally live?",
    a: "On the Windows machine you used back then, they lived at C:\\Program Files\\Yahoo!\\Messenger\\Profiles\\ (sometimes under Program Files (x86)). If you've since copied them to a Mac, an external drive, iCloud, or a stack of DVDs — no problem. Just point the viewer at whichever folder you kept, by any name.",
  },
  {
    q: "Do I have to name the folder \"Profiles\"?",
    a: "No. The viewer anchors on the Archive/Messages/ structure, not the outer folder name. profiles1, profiles2, backup_2007, old_chats — all fine. You can even drop a parent folder that contains several of these side-by-side and we'll merge them.",
  },
  {
    q: "Does this work on a Mac?",
    a: "Yes. The viewer runs in any modern browser — Chrome, Safari, Firefox, Edge, on macOS, Windows, or Linux. The original Yahoo! Messenger was a Windows app, but you don't need Windows to browse the archive it left behind.",
  },
  {
    q: "Is this really private?",
    a: "Yes. All parsing, XOR decryption, and rendering happens in JavaScript on your device. The site is a static bundle — there's no backend. Open your browser's Network tab and you'll see zero outgoing requests with your data.",
  },
  {
    q: "What if my archive has multiple profiles?",
    a: "No problem — every profile folder gets its own account in the sidebar. Switch between them freely. If you opened snapshots from two different backups (say profiles1 and profiles2) that happened to contain the same profile, duplicate messages are removed automatically.",
  },
  {
    q: "Why do some of my filenames look truncated?",
    a: "Older Windows copies sometimes hit the long-path limit and truncated filenames when zipping. The viewer matches files by folder structure, not exact names, so this still works.",
  },
  {
    q: "Can I see images I shared?",
    a: "Unfortunately no — Yahoo! never actually stored sent images in the archive, only a marker that a transfer happened. You'll see a 📎 placeholder where images used to be.",
  },
  {
    q: "Where does my archive live after the first upload?",
    a: "Right in your own browser. The first decode runs on your device; the parsed result is saved to this site's IndexedDB store so re-opening the same archive later is instant — no re-parsing. A tiny pointer (which profile and conversation you had open last) lives in localStorage. Both are per-site, per-device — only this site on your browser can read them, and only you have access. To wipe everything, use the \"Clear all\" button in the recent-archives list, or open DevTools → Application → Storage → Clear site data.",
  },
  {
    q: "What about privacy for conversations of other people in the archive?",
    a: "Worth thinking about. Yahoo's .dat format was never strongly encrypted — the files are just XOR-scrambled with the account's username, which means anyone who has the files on disk can read them with a tool like this one. Back then, the Messenger login password protected live access; it did not encrypt the archive. If you're opening a Profiles folder from an old shared computer (a family PC, a sibling's account, an ex-partner's), their conversations decode exactly like yours do, and no password on that old machine stood in the way. This site does no authentication and no ownership check — it runs entirely on your device and only does what you tell it to. You're deciding what to open; responsibility for what you read, keep, or share stays with you. If you're unsure whether you should be reading a particular archive, please don't.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="bg-ym-cream">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="text-center font-display text-4xl text-ym-purple-dark">
          Questions people actually ask
        </h2>
        <div className="mt-10 space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-xl border border-slate-200 bg-white p-5 open:shadow-md"
            >
              <summary className="cursor-pointer list-none font-semibold text-slate-900">
                <span className="mr-2 text-ym-purple">▸</span>
                {f.q}
              </summary>
              <p className="mt-3 pl-5 text-sm leading-relaxed text-slate-600">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
