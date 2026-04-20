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
  let y = PAGE.marginTop;

  doc.setFont(fontName, "normal");
  doc.setFontSize(FONT_SIZES.title);
  doc.setTextColor(COLORS.title);
  doc.text(`Conversation with ${conversation.peer}`, PAGE.marginX, y, {
    baseline: "top",
  });
  y += lineHeightMm(FONT_SIZES.title) + 1.5;

  const first = messages[0]?.timestamp;
  const last = messages[messages.length - 1]?.timestamp;
  const range = first && last ? formatDateRange(first, last) : "";
  const scopeNote = scope === "filtered" ? " (filtered)" : "";
  const sub = `From ${profile.username} · ${messages.length.toLocaleString()} messages${scopeNote}${range ? ` · ${range}` : ""}`;

  doc.setFontSize(FONT_SIZES.subtitle);
  doc.setTextColor(COLORS.subtitle);
  doc.text(sub, PAGE.marginX, y, { baseline: "top" });
  y += lineHeightMm(FONT_SIZES.subtitle) + 1;

  const today = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(`Exported ${today}`, PAGE.marginX, y, { baseline: "top" });
  y += lineHeightMm(FONT_SIZES.subtitle) + 1;

  // Attribution link — pulled out of the per-page footer so it appears once,
  // up front, alongside the other "what is this?" metadata.
  doc.setFontSize(FONT_SIZES.footer);
  doc.setTextColor(COLORS.link);
  const linkText = "Generated with ymarchive.chat";
  doc.text(linkText, PAGE.marginX, y, { baseline: "top" });
  const linkW = doc.getTextWidth(linkText);
  const linkH = lineHeightMm(FONT_SIZES.footer);
  doc.link(PAGE.marginX, y, linkW, linkH, { url: "https://ymarchive.chat" });
  y += linkH + 6;

  return y;
}

function drawFootersOnAllPages(doc: JsPDFType, fontName: string): void {
  const pageCount = doc.getNumberOfPages();
  doc.setFont(fontName, "normal");
  doc.setFontSize(FONT_SIZES.footer);
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const footY = PAGE.pageH - 8;
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
  pageNumber: number; // resolved during render, shifted after TOC insertion
}

const TOC_ENTRIES_PER_PAGE = 40;

function formatMonthLabel(m: MonthMarker): string {
  return new Date(m.monthStartTs * 1000).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function drawTocPage(
  doc: JsPDFType,
  fontName: string,
  entries: MonthMarker[],
  isFirstTocPage: boolean,
): void {
  let y = PAGE.marginTop;

  if (isFirstTocPage) {
    doc.setFont(fontName, "normal");
    doc.setFontSize(FONT_SIZES.title);
    doc.setTextColor(COLORS.title);
    doc.text("Contents", PAGE.marginX, y, { baseline: "top" });
    y += lineHeightMm(FONT_SIZES.title) + 4;
  }

  doc.setFont(fontName, "normal");
  doc.setFontSize(FONT_SIZES.subtitle);
  const lineH = lineHeightMm(FONT_SIZES.subtitle) + 2.5;

  for (const e of entries) {
    const label = formatMonthLabel(e);
    const countText = `${e.count.toLocaleString()} ${e.count === 1 ? "message" : "messages"}`;

    doc.setTextColor(COLORS.link);
    doc.text(label, PAGE.marginX, y, { baseline: "top" });

    doc.setTextColor(COLORS.subtitle);
    doc.text(countText, PAGE.marginX + PAGE.contentW, y, {
      baseline: "top",
      align: "right",
    });

    // Whole row is clickable.
    doc.link(PAGE.marginX, y, PAGE.contentW, lineH, {
      pageNumber: e.pageNumber,
    });

    y += lineH;
  }
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

  let lastDay = -1;
  let lastSender: string | null = null;
  let lastIsLocal: boolean | null = null;
  const monthMarkers: MonthMarker[] = [];
  let currentMonth: MonthMarker | null = null;

  for (const msg of messages) {
    const day = startOfDay(msg.timestamp);
    if (day !== lastDay) {
      const dh = dividerHeight();
      if (y + dh > PAGE.contentBottom) {
        doc.addPage();
        y = PAGE.marginTop;
      }

      // Capture the start-of-month marker AFTER any divider page break, so
      // the recorded pageNumber matches where the user will visually land.
      const d = new Date(msg.timestamp * 1000);
      const yr = d.getFullYear();
      const mo = d.getMonth();
      if (
        !currentMonth ||
        currentMonth.year !== yr ||
        currentMonth.month !== mo
      ) {
        currentMonth = {
          year: yr,
          month: mo,
          monthStartTs: new Date(yr, mo, 1, 0, 0, 0, 0).getTime() / 1000,
          count: 0,
          pageNumber: doc.getCurrentPageInfo().pageNumber,
        };
        monthMarkers.push(currentMonth);
      }

      drawDivider(doc, fontName, formatDateDivider(msg.timestamp), y);
      y += dh + 1.5;
      lastDay = day;
      lastSender = null;
      lastIsLocal = null;
    }

    if (currentMonth) currentMonth.count++;

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

  // Insert TOC pages between the cover and the body when the conversation
  // spans multiple months. Pages are inserted blank, then filled and linked.
  if (monthMarkers.length >= 2) {
    const tocPagesNeeded = Math.ceil(
      monthMarkers.length / TOC_ENTRIES_PER_PAGE,
    );
    for (let i = 0; i < tocPagesNeeded; i++) {
      doc.insertPage(2);
    }
    for (const m of monthMarkers) {
      m.pageNumber += tocPagesNeeded;
    }
    for (let i = 0; i < tocPagesNeeded; i++) {
      doc.setPage(2 + i);
      const slice = monthMarkers.slice(
        i * TOC_ENTRIES_PER_PAGE,
        (i + 1) * TOC_ENTRIES_PER_PAGE,
      );
      drawTocPage(doc, fontName, slice, i === 0);
    }
    // Sidebar bookmarks — cheap bonus for PDF viewers that show an outline.
    for (const m of monthMarkers) {
      doc.outline.add(null, formatMonthLabel(m), { pageNumber: m.pageNumber });
    }
  }

  drawFootersOnAllPages(doc, fontName);

  const filename = `${sanitize(profile.username)}-with-${sanitize(conversation.peer)}.pdf`;
  doc.save(filename);
}
