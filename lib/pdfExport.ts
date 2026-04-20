import type { jsPDF as JsPDFType } from "jspdf";
import { formatDateDivider, formatDateRange, formatTime } from "./format";
import { ensureFontRegistered } from "./pdfFont";
import type { YMConversation, YMMessage, YMProfile } from "./types";

const PAGE = {
  pageW: 210,
  pageH: 297,
  marginX: 15,
  marginTop: 15,
  marginBottom: 18,
  contentW: 180,
  contentBottom: 297 - 18,
} as const;

const COLORS = {
  peerBubble: "#ffffff",
  peerBorder: "#e5e7eb",
  peerText: "#0f172a",
  localBubble: "#6f2da8",
  localText: "#ffffff",
  meta: "#94a3b8",
  divider: "#475569",
  dividerBg: "#ffffff",
  dividerBorder: "#e5e7eb",
  buzzBg: "#fffbeb",
  buzzBorder: "#fcd34d",
  buzzText: "#b45309",
  link: "#6f2da8",
  title: "#0f172a",
  subtitle: "#475569",
  // Cover-specific palette, picked from the landing page (tailwind.config.ts).
  ymPurple: "#6f2da8",
  ymPurpleDark: "#4b1e73",
  ymCream: "#fef9f3",
  hairline: "#e2e8f0", // slate-200
  meta2: "#64748b",    // slate-500
} as const;

const FONT_SIZES = {
  message: 10,
  sender: 7.5,
  time: 7,
  divider: 8,
  title: 18,
  subtitle: 10,
  footer: 8,
} as const;

const BUBBLE = {
  maxWidthRatio: 0.7,
  padX: 3,
  padY: 2.2,
  radius: 2.5,
  vGap: 1.8,
} as const;

const PT_TO_MM = 0.3528;
const LINE_LEADING = 1.15;

function lineHeightMm(pt: number): number {
  return pt * PT_TO_MM * LINE_LEADING;
}

function startOfDay(unix: number): number {
  const d = new Date(unix * 1000);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

function sanitize(s: string): string {
  const cleaned = s.replace(/[/\\:*?"<>|\x00-\x1f]/g, "_").trim();
  return cleaned.slice(0, 80) || "conversation";
}

interface BubbleLayout {
  lines: string[];
  lineH: number;
  bubbleW: number;
  bubbleH: number;
  senderH: number;
  timeH: number;
  totalHeight: number;
}

function layoutBubble(
  doc: JsPDFType,
  fontName: string,
  msg: YMMessage,
  showSender: boolean,
): BubbleLayout {
  const text = msg.isImageShare && !msg.text ? "[Image shared]" : msg.text || " ";
  const maxBubbleW = PAGE.contentW * BUBBLE.maxWidthRatio;
  const maxTextW = maxBubbleW - 2 * BUBBLE.padX;

  doc.setFont(fontName, "normal");
  doc.setFontSize(FONT_SIZES.message);
  const lines = doc.splitTextToSize(text, maxTextW) as string[];
  const lineH = lineHeightMm(FONT_SIZES.message);
  const textH = lines.length * lineH;
  const bubbleH = textH + 2 * BUBBLE.padY;

  let maxLineW = 0;
  for (const line of lines) {
    const w = doc.getTextWidth(line);
    if (w > maxLineW) maxLineW = w;
  }
  const bubbleW = Math.min(maxBubbleW, maxLineW + 2 * BUBBLE.padX);

  const senderH = showSender ? lineHeightMm(FONT_SIZES.sender) + 0.5 : 0;
  const timeH = lineHeightMm(FONT_SIZES.time) + 0.5;

  return {
    lines,
    lineH,
    bubbleW,
    bubbleH,
    senderH,
    timeH,
    totalHeight: senderH + bubbleH + timeH,
  };
}

function drawBubble(
  doc: JsPDFType,
  fontName: string,
  msg: YMMessage,
  y: number,
  layout: BubbleLayout,
  showSender: boolean,
): void {
  const isLocal = msg.isLocal;
  const x = isLocal
    ? PAGE.marginX + PAGE.contentW - layout.bubbleW
    : PAGE.marginX;

  let cy = y;
  doc.setFont(fontName, "normal");

  if (showSender) {
    doc.setFontSize(FONT_SIZES.sender);
    doc.setTextColor(COLORS.meta);
    if (isLocal) {
      doc.text(msg.sender, PAGE.marginX + PAGE.contentW, cy, {
        align: "right",
        baseline: "top",
      });
    } else {
      doc.text(msg.sender, PAGE.marginX, cy, { baseline: "top" });
    }
    cy += layout.senderH;
  }

  if (isLocal) {
    doc.setFillColor(COLORS.localBubble);
    doc.roundedRect(
      x,
      cy,
      layout.bubbleW,
      layout.bubbleH,
      BUBBLE.radius,
      BUBBLE.radius,
      "F",
    );
    doc.setTextColor(COLORS.localText);
  } else {
    doc.setFillColor(COLORS.peerBubble);
    doc.setDrawColor(COLORS.peerBorder);
    doc.setLineWidth(0.15);
    doc.roundedRect(
      x,
      cy,
      layout.bubbleW,
      layout.bubbleH,
      BUBBLE.radius,
      BUBBLE.radius,
      "FD",
    );
    doc.setTextColor(COLORS.peerText);
  }

  doc.setFontSize(FONT_SIZES.message);
  for (let i = 0; i < layout.lines.length; i++) {
    doc.text(
      layout.lines[i],
      x + BUBBLE.padX,
      cy + BUBBLE.padY + i * layout.lineH,
      { baseline: "top" },
    );
  }
  cy += layout.bubbleH;

  doc.setFontSize(FONT_SIZES.time);
  doc.setTextColor(COLORS.meta);
  const tt = formatTime(msg.timestamp);
  if (isLocal) {
    doc.text(tt, PAGE.marginX + PAGE.contentW, cy + 0.5, {
      align: "right",
      baseline: "top",
    });
  } else {
    doc.text(tt, PAGE.marginX, cy + 0.5, { baseline: "top" });
  }
}

function buzzHeight(): number {
  return lineHeightMm(FONT_SIZES.message) + 4;
}

function drawBuzz(
  doc: JsPDFType,
  fontName: string,
  msg: YMMessage,
  y: number,
): void {
  const text = `*** ${msg.sender} sent a BUZZ! · ${formatTime(msg.timestamp)} ***`;
  doc.setFont(fontName, "normal");
  doc.setFontSize(FONT_SIZES.message);
  const tw = doc.getTextWidth(text);
  const h = buzzHeight();
  const w = Math.min(PAGE.contentW, tw + 8);
  const x = PAGE.marginX + (PAGE.contentW - w) / 2;
  doc.setFillColor(COLORS.buzzBg);
  doc.setDrawColor(COLORS.buzzBorder);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, "FD");
  doc.setTextColor(COLORS.buzzText);
  doc.text(text, x + w / 2, y + h / 2, {
    align: "center",
    baseline: "middle",
  });
}

function dividerHeight(): number {
  return lineHeightMm(FONT_SIZES.divider) + 2.5;
}

function drawDivider(doc: JsPDFType, fontName: string, text: string, y: number): void {
  doc.setFont(fontName, "normal");
  doc.setFontSize(FONT_SIZES.divider);
  const tw = doc.getTextWidth(text);
  const h = dividerHeight();
  const w = tw + 6;
  const x = PAGE.marginX + (PAGE.contentW - w) / 2;
  doc.setFillColor(COLORS.dividerBg);
  doc.setDrawColor(COLORS.dividerBorder);
  doc.setLineWidth(0.15);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, "FD");
  doc.setTextColor(COLORS.divider);
  doc.text(text, x + w / 2, y + h / 2, {
    align: "center",
    baseline: "middle",
  });
}

function drawCoverHeader(
  doc: JsPDFType,
  fontName: string,
  profile: YMProfile,
  conversation: YMConversation,
  messages: YMMessage[],
  scope: "filtered" | "full",
): number {
  // Full-width purple accent stripe at the very top — visual anchor that
  // echoes the landing page's use of ym-purple.
  doc.setFillColor(COLORS.ymPurple);
  doc.rect(0, 0, PAGE.pageW, 2.5, "F");

  let y = PAGE.marginTop + 3;

  // Eyebrow — small, uppercase, tracked, ym-purple.
  doc.setFont(fontName, "normal");
  doc.setFontSize(8);
  doc.setTextColor(COLORS.ymPurple);
  doc.setCharSpace(0.8);
  doc.text("YAHOO!  MESSENGER  ARCHIVE", PAGE.marginX, y, { baseline: "top" });
  doc.setCharSpace(0);
  y += lineHeightMm(8) + 6;

  // Display title — split onto two lines so the two participants are
  // visually prominent, landing-page style.
  doc.setFontSize(24);
  doc.setTextColor(COLORS.ymPurpleDark);
  doc.text("Conversation between", PAGE.marginX, y, { baseline: "top" });
  y += lineHeightMm(24) + 0.5;

  const namesText = `${profile.username} and ${conversation.peer}`;
  const nameLines = doc.splitTextToSize(namesText, PAGE.contentW) as string[];
  for (const line of nameLines) {
    doc.text(line, PAGE.marginX, y, { baseline: "top" });
    y += lineHeightMm(24);
  }
  y += 5;

  // Meta line — date range + message count, slightly subdued.
  const first = messages[0]?.timestamp;
  const last = messages[messages.length - 1]?.timestamp;
  const range = first && last ? formatDateRange(first, last) : "";
  const scopeNote = scope === "filtered" ? " (filtered)" : "";
  const sub = `${range ? `${range}  ·  ` : ""}${messages.length.toLocaleString()} messages${scopeNote}`;
  doc.setFontSize(11);
  doc.setTextColor(COLORS.subtitle);
  doc.text(sub, PAGE.marginX, y, { baseline: "top" });
  y += lineHeightMm(11) + 7;

  // Hairline divider to visually separate the title block from the TOC.
  doc.setDrawColor(COLORS.hairline);
  doc.setLineWidth(0.2);
  doc.line(PAGE.marginX, y, PAGE.marginX + PAGE.contentW, y);
  y += 4.5;

  // Attribution block — exported date + clickable ymarchive.chat link.
  const today = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.setFontSize(9);
  doc.setTextColor(COLORS.meta2);
  const exportedText = `Exported ${today}  ·  Generated with `;
  doc.text(exportedText, PAGE.marginX, y, { baseline: "top" });
  const exportedW = doc.getTextWidth(exportedText);

  doc.setTextColor(COLORS.link);
  const linkText = "ymarchive.chat";
  doc.text(linkText, PAGE.marginX + exportedW, y, { baseline: "top" });
  const linkW = doc.getTextWidth(linkText);
  const linkH = lineHeightMm(9);
  doc.link(PAGE.marginX + exportedW, y, linkW, linkH, {
    url: "https://ymarchive.chat",
  });
  y += linkH + 10;

  return y;
}

function drawFootersOnAllPages(
  doc: JsPDFType,
  fontName: string,
  toc: { firstPage: number; lastPage: number } | null,
): void {
  const pageCount = doc.getNumberOfPages();
  doc.setFont(fontName, "normal");
  doc.setFontSize(FONT_SIZES.footer);
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const footY = PAGE.pageH - 8;

    // "← Contents" jump on every body page (i.e. anything past the TOC).
    // Cover and TOC pages don't need it — cover is right above the TOC, and
    // the TOC pages are the contents.
    if (toc && p > toc.lastPage) {
      const tocText = "← Contents";
      doc.setTextColor(COLORS.link);
      doc.text(tocText, PAGE.marginX, footY, { baseline: "alphabetic" });
      const tw = doc.getTextWidth(tocText);
      const lh = lineHeightMm(FONT_SIZES.footer);
      doc.link(PAGE.marginX, footY - lh + 1, tw, lh, {
        pageNumber: toc.firstPage,
      });
    }

    doc.setTextColor(COLORS.meta);
    doc.text(`Page ${p} of ${pageCount}`, PAGE.marginX + PAGE.contentW, footY, {
      align: "right",
    });
  }
}

interface MonthMarker {
  year: number;
  month: number; // 0-11
  monthStartTs: number; // unix seconds
  count: number;
  pageNumber: number; // resolved during render
}

interface TocLinkRect {
  marker: MonthMarker;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

function formatMonthLabel(m: MonthMarker): string {
  return new Date(m.monthStartTs * 1000).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

/**
 * Walk messages once, returning one MonthMarker per distinct (year, month).
 * Counts are filled in here; `pageNumber` is filled in later by the render
 * loop. Markers are returned in chronological order (input order).
 */
function precomputeMonths(messages: YMMessage[]): {
  markers: MonthMarker[];
  byKey: Map<string, MonthMarker>;
} {
  const byKey = new Map<string, MonthMarker>();
  const markers: MonthMarker[] = [];
  for (const m of messages) {
    const d = new Date(m.timestamp * 1000);
    const yr = d.getFullYear();
    const mo = d.getMonth();
    const key = `${yr}-${mo}`;
    let entry = byKey.get(key);
    if (!entry) {
      entry = {
        year: yr,
        month: mo,
        monthStartTs: new Date(yr, mo, 1, 0, 0, 0, 0).getTime() / 1000,
        count: 0,
        pageNumber: 0,
      };
      byKey.set(key, entry);
      markers.push(entry);
    }
    entry.count++;
  }
  return { markers, byKey };
}

/**
 * Draw the TOC inline starting at `startY` on the current page. Overflows
 * onto additional pages naturally. Records each row's geometry so links can
 * be added later, once the message render pass has resolved page numbers.
 */
function drawTocInline(
  doc: JsPDFType,
  fontName: string,
  markers: MonthMarker[],
  startY: number,
): { endY: number; linkRects: TocLinkRect[]; lastPage: number } {
  let y = startY;

  doc.setFont(fontName, "normal");
  doc.setFontSize(FONT_SIZES.title);
  doc.setTextColor(COLORS.title);
  doc.text("Contents", PAGE.marginX, y, { baseline: "top" });
  y += lineHeightMm(FONT_SIZES.title) + 4;

  doc.setFontSize(FONT_SIZES.subtitle);
  const lineH = lineHeightMm(FONT_SIZES.subtitle) + 2.5;
  const linkRects: TocLinkRect[] = [];

  for (const m of markers) {
    if (y + lineH > PAGE.contentBottom) {
      doc.addPage();
      y = PAGE.marginTop;
    }
    const label = formatMonthLabel(m);
    const countText = `${m.count.toLocaleString()} ${m.count === 1 ? "message" : "messages"}`;

    doc.setTextColor(COLORS.link);
    doc.text(label, PAGE.marginX, y, { baseline: "top" });

    doc.setTextColor(COLORS.subtitle);
    doc.text(countText, PAGE.marginX + PAGE.contentW, y, {
      baseline: "top",
      align: "right",
    });

    linkRects.push({
      marker: m,
      page: doc.getCurrentPageInfo().pageNumber,
      x: PAGE.marginX,
      y,
      w: PAGE.contentW,
      h: lineH,
    });

    y += lineH;
  }

  return {
    endY: y,
    linkRects,
    lastPage: doc.getCurrentPageInfo().pageNumber,
  };
}

export interface ExportOptions {
  scope: "filtered" | "full";
}

export async function exportConversationToPdf(
  profile: YMProfile,
  conversation: YMConversation,
  messages: YMMessage[],
  opts: ExportOptions = { scope: "full" },
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
    compress: true,
  });

  const fontName = await ensureFontRegistered(doc);
  doc.setFont(fontName, "normal");

  let y = drawCoverHeader(doc, fontName, profile, conversation, messages, opts.scope);

  // Precompute month buckets + counts so the TOC can be drawn inline (right
  // under the cover, on the same page) instead of leaving the rest of page 1
  // blank. Page numbers are filled in by the render loop below; TOC links
  // are patched in after that.
  const { markers: monthMarkers, byKey: monthByKey } = precomputeMonths(messages);
  const willHaveToc = monthMarkers.length >= 2;

  let tocLinkRects: TocLinkRect[] = [];
  let tocLastPage = 0;

  if (willHaveToc) {
    const toc = drawTocInline(doc, fontName, monthMarkers, y);
    tocLinkRects = toc.linkRects;
    tocLastPage = toc.lastPage;
    // Body starts on a fresh page so the TOC and the conversation don't
    // visually mash into each other.
    doc.addPage();
    y = PAGE.marginTop;
  }

  let lastDay = -1;
  let lastSender: string | null = null;
  let lastIsLocal: boolean | null = null;
  let currentMonth: MonthMarker | null = null;

  for (const msg of messages) {
    const day = startOfDay(msg.timestamp);
    if (day !== lastDay) {
      const dh = dividerHeight();
      if (y + dh > PAGE.contentBottom) {
        doc.addPage();
        y = PAGE.marginTop;
      }

      // Resolve the precomputed month marker's pageNumber AFTER any divider
      // page break, so it matches the page the divider actually lands on.
      const d = new Date(msg.timestamp * 1000);
      const yr = d.getFullYear();
      const mo = d.getMonth();
      if (
        !currentMonth ||
        currentMonth.year !== yr ||
        currentMonth.month !== mo
      ) {
        const marker = monthByKey.get(`${yr}-${mo}`);
        if (marker && marker.pageNumber === 0) {
          marker.pageNumber = doc.getCurrentPageInfo().pageNumber;
        }
        currentMonth = marker ?? null;
      }

      drawDivider(doc, fontName, formatDateDivider(msg.timestamp), y);
      y += dh + 1.5;
      lastDay = day;
      lastSender = null;
      lastIsLocal = null;
    }

    if (msg.isBuzz) {
      const bh = buzzHeight();
      if (y + bh > PAGE.contentBottom) {
        doc.addPage();
        y = PAGE.marginTop;
      }
      drawBuzz(doc, fontName, msg, y);
      y += bh + BUBBLE.vGap;
      lastSender = null;
      lastIsLocal = null;
      continue;
    }

    const showSender =
      msg.sender !== lastSender || msg.isLocal !== lastIsLocal;
    const layout = layoutBubble(doc, fontName, msg, showSender);

    if (y + layout.totalHeight > PAGE.contentBottom) {
      doc.addPage();
      y = PAGE.marginTop;
    }

    drawBubble(doc, fontName, msg, y, layout, showSender);
    y += layout.totalHeight + BUBBLE.vGap;
    lastSender = msg.sender;
    lastIsLocal = msg.isLocal;
  }

  // Patch TOC link annotations now that the body render has resolved each
  // month's page number. The TOC text was already drawn inline under the
  // cover; we just need to attach the click targets.
  let tocInfo: { firstPage: number; lastPage: number } | null = null;
  if (willHaveToc) {
    for (const rect of tocLinkRects) {
      if (rect.marker.pageNumber > 0) {
        doc.setPage(rect.page);
        doc.link(rect.x, rect.y, rect.w, rect.h, {
          pageNumber: rect.marker.pageNumber,
        });
      }
    }
    // Sidebar bookmarks — cheap bonus for PDF viewers that show an outline.
    for (const m of monthMarkers) {
      if (m.pageNumber > 0) {
        doc.outline.add(null, formatMonthLabel(m), { pageNumber: m.pageNumber });
      }
    }
    // TOC starts on page 1 (under the cover header) and may overflow onto
    // additional pages. Body pages get a "← Contents" footer jump back to
    // page 1.
    tocInfo = { firstPage: 1, lastPage: tocLastPage };
  }

  drawFootersOnAllPages(doc, fontName, tocInfo);

  const filename = `${sanitize(profile.username)}-with-${sanitize(conversation.peer)}.pdf`;
  doc.save(filename);
}
