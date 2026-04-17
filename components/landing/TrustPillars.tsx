const PILLARS = [
  {
    icon: "🔒",
    title: "Completely private",
    body: "Your files never leave your device. All parsing and decoding runs in your browser with zero server uploads.",
  },
  {
    icon: "💸",
    title: "Free forever",
    body: "Static site. No accounts, no paywalls, no upsells. The whole thing is open source.",
  },
  {
    icon: "🗑️",
    title: "Nothing stored",
    body: "Close the tab and it's gone. No cookies, no tracking, no database. We literally can't see your messages.",
  },
];

export function TrustPillars() {
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-3">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-slate-200 bg-ym-cream p-6 shadow-sm"
            >
              <div className="text-3xl">{p.icon}</div>
              <h3 className="mt-3 font-bold text-slate-900">{p.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
