const STEPS = [
  {
    n: "1",
    title: "Point us at your archive",
    body: "Drag in a folder (profiles1, profiles2, or whatever you named it), a parent folder containing several of those, or a .zip. The browser reads it — nothing is uploaded anywhere.",
  },
  {
    n: "2",
    title: "Decoded in your browser",
    body: "We parse the .dat files and reverse Yahoo's XOR scheme right on your device. Everything happens locally in JavaScript.",
  },
  {
    n: "3",
    title: "Browse your chats",
    body: "Every conversation, every buzz, every smiley. Search, filter by date, and scroll through years of history.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-ym-cream">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center font-display text-4xl text-ym-purple-dark">
          How it works
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
          Three steps. No server involved. You can open your browser's Network
          tab and watch zero requests go out with your data.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ym-purple text-lg font-bold text-white">
                {s.n}
              </div>
              <h3 className="mt-4 font-bold text-slate-900">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
