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
  y += lineHeightMm(FONT_SIZES.subtitle) + 5;

  return y;
}

function drawFootersOnAllPages(doc: JsPDFType, fontName: string): void {
  const pageCount = doc.getNumberOfPages();
  doc.setFont(fontName, "normal");
  doc.setFontSize(FONT_SIZES.footer);
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const footY = PAGE.pageH - 8;

    const linkText = "Generated with ymarchive.chat";
    const tw = doc.getTextWidth(linkText);
    const linkX = PAGE.marginX + (PAGE.contentW - tw) / 2;
    doc.setTextColor(COLORS.link);
    doc.textWithLink(linkText, linkX, footY, {
      url: "https://ymarchive.chat",
    });

    doc.setTextColor(COLORS.meta);
    doc.text(`Page ${p} of ${pageCount}`, PAGE.marginX + PAGE.contentW, footY, {
      align: "right",
    });
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

  for (const msg of messages) {
    const day = startOfDay(msg.timestamp);
    if (day !== lastDay) {
      const dh = dividerHeight();
      if (y + dh > PAGE.contentBottom) {
        doc.addPage();
        y = PAGE.marginTop;
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

  drawFootersOnAllPages(doc, fontName);

  const filename = `${sanitize(profile.username)}-with-${sanitize(conversation.peer)}.pdf`;
  doc.save(filename);
}
