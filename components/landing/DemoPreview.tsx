const SAMPLE = [
  { from: "peer", time: "19:42", text: "hey you on?" },
  { from: "me", time: "19:42", text: "yeah just got home 😊" },
  { from: "peer", time: "19:43", text: "listening to that new CD i burned u" },
  { from: "me", time: "19:43", text: "omg the one with the track 7 skip lol" },
  { from: "peer", time: "19:44", text: "hahaha" },
  { from: "me", time: "19:44", text: "<3" },
];

export function DemoPreview() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center font-display text-4xl text-ym-purple-dark">
          Here's what you'll see
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
          A clean chat view, emoticons rendered as emoji, buzzes as buzzes, and
          all your old profile pictures in one place.
        </p>
        <div className="mx-auto mt-10 max-w-2xl overflow-hidden rounded-3xl border border-slate-200 shadow-xl">
          <div className="flex items-center gap-3 bg-ym-purple px-5 py-3 text-white">
            <div className="h-9 w-9 rounded-full bg-white/20" />
            <div>
              <div className="text-sm font-bold">crystal_princess_07</div>
              <div className="text-xs text-white/70">3,428 messages · 2006 – 2009</div>
            </div>
          </div>
          <div className="space-y-3 bg-ym-cream p-5">
            <div className="text-center text-xs text-slate-500">
              Tuesday, July 17, 2007
            </div>
            {SAMPLE.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    m.from === "me"
                      ? "rounded-br-sm bg-ym-purple text-white"
                      : "rounded-bl-sm bg-white text-slate-900"
                  }`}
                >
                  <div>{m.text}</div>
                  <div
                    className={`mt-1 text-[10px] ${
                      m.from === "me" ? "text-white/60" : "text-slate-400"
                    }`}
                  >
                    {m.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
