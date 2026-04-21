// Runtime device-class detection. Used to gate folder uploads on mobile,
// where per-file I/O is dramatically slower than on desktop (see
// CLAUDE.md: folder uploads make N separate IPC round-trips per .dat file;
// zip uploads make one).
//
// Must be called from the client — guarded against SSR.

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPod|iPad|Mobile|Opera Mini|IEMobile|webOS/i.test(ua)) {
    return true;
  }

  // iPadOS 13+ reports as Mac — disambiguate via touch points.
  const maxTouchPoints = (navigator as Navigator & { maxTouchPoints?: number })
    .maxTouchPoints;
  if (
    typeof maxTouchPoints === "number" &&
    maxTouchPoints > 1 &&
    /Macintosh/.test(ua)
  ) {
    return true;
  }

  // Last-resort fallback: coarse pointer + small viewport.
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches &&
    window.matchMedia("(max-width: 820px)").matches
  ) {
    return true;
  }

  return false;
}
