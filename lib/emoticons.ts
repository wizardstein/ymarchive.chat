const EMOTICONS: Record<string, string> = {
  ":)": "😊", ":-)": "😊", "=)": "😊",
  ":D": "😄", ":-D": "😄", "=D": "😄",
  ":(": "😞", ":-(": "😞",
  ";)": "😉", ";-)": "😉",
  ":P": "😛", ":-P": "😛", "=P": "😛",
  ":O": "😮", ":-O": "😮", ":o": "😮",
  ":|": "😐", ":-|": "😐",
  ":*": "😘", ":-*": "😘",
  ":/": "😕", ":-/": "😕",
  ":S": "😖", ":-S": "😖",
  ":@": "😤", ":-@": "😤",
  ":-&": "🤢",
  ">:(": "😠", ">:-(": "😠",
  "8)": "😎", "8-)": "😎",
  "<3": "❤️",
  ":))": "😄", ":)))": "😂", ":))))": "😂",
  ":-))": "😄", ":-)))": "😂",
  ":((": "😢", ":(((": "😭",
  ":-?": "🤔", ":-??": "🤔",
  "(*)": "⭐",
  "(e)": "📧",
  buzz: "📳",
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Sort longest-first so ":))" matches before ":)"
const SORTED_KEYS = Object.keys(EMOTICONS).sort((a, b) => b.length - a.length);

const EMOTICON_PATTERN = new RegExp(
  "(" + SORTED_KEYS.map(escapeRegex).join("|") + ")",
  "g",
);

export function replaceEmoticons(text: string): string {
  return text.replace(EMOTICON_PATTERN, (match) => EMOTICONS[match] ?? match);
}

export function isBuzzMessage(text: string): boolean {
  return text.trim().toLowerCase() === "buzz";
}
