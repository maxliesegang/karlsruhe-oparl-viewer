/**
 * Finds a summary key point's source quote in an attachment's extracted text,
 * so the viewer can highlight the passage a key point rests on.
 *
 * The scraper stores the quote "as it reads in the source" but cleaned for
 * display: whitespace collapsed, page markers removed, line-break hyphenation
 * joined. The raw `.txt` still has all of that, so both sides are folded the
 * way the scraper folds them when it locates the quote
 * (`summary-key-point-sources.ts` in the syndication repo) and compared there;
 * the hit is mapped back to offsets in the raw text.
 */

/** pdf-parse closes each page with `-- N of M --` on its own line. */
const PAGE_MARKER = /^-- \d+ of \d+ --$/gm;

/** A stored quote over 500 characters is cut and ends in " …". */
const TRUNCATION = /\s*…$/;

/** Fallback needle when the whole quote is not found: its opening words. */
const HEAD_WORD_COUNT = 8;
const MINIMUM_HEAD_CHARACTERS = 20;

const FOLDED_CHARACTERS: Record<string, string> = {
  "‐": "-",
  "„": '"',
  "“": '"',
  "”": '"',
  "‚": "'",
  "‘": "'",
  "’": "'",
  "«": '"',
  "»": '"',
  "–": "-",
  "—": "-",
  "‑": "-",
  "²": "2",
  "³": "3",
};

interface FoldedText {
  comparable: string;
  /** Offset in the original text of each `comparable` character. */
  offsets: number[];
}

function foldCharacter(character: string): string {
  const folded = FOLDED_CHARACTERS[character];
  if (folded) return folded;
  const lower = character.toLowerCase();
  return lower.length === 1 ? lower : character;
}

/**
 * Same folding as the scraper: page markers and soft hyphens dropped,
 * whitespace collapsed, case/quotes/dashes folded, and a hyphen after a letter
 * dropped together with the whitespace after it (`Straßen-\nzügen` and the
 * stored `Straßenzügen` then compare equal).
 */
function fold(text: string): FoldedText {
  const source = text.replace(PAGE_MARKER, (marker) =>
    " ".repeat(marker.length),
  );
  let comparable = "";
  const offsets: number[] = [];
  let lastWasSpace = true;

  for (let index = 0; index < source.length; index++) {
    const character = foldCharacter(source[index]);
    if (character === "­") continue;
    if (character === "-" && /\p{L}/u.test(source[index - 1] ?? "")) {
      while (/\s/.test(source[index + 1] ?? "")) index++;
      continue;
    }
    if (/\s/.test(character)) {
      if (lastWasSpace) continue;
      lastWasSpace = true;
      comparable += " ";
      offsets.push(index);
      continue;
    }
    lastWasSpace = false;
    comparable += character;
    offsets.push(index);
  }
  return { comparable, offsets };
}

/**
 * Attachment texts run to 1.4M characters and a summary's key points usually
 * cite the same one, so the last folded text is kept for the next lookup.
 */
let lastFolded: { text: string; folded: FoldedText } | undefined;

function foldCached(text: string): FoldedText {
  if (lastFolded?.text !== text) lastFolded = { text, folded: fold(text) };
  return lastFolded.folded;
}

/**
 * `[start, end)` of the quoted passage in `text`, or `undefined` when it is not
 * there. Falls back to the quote's opening words, which covers a truncated
 * quote and an extraction that changed since the summary was written.
 */
export function findQuoteRange(
  text: string,
  quote: string,
): { start: number; end: number } | undefined {
  const needle = fold(quote.replace(TRUNCATION, "")).comparable.trim();
  if (!needle) return undefined;
  const haystack = foldCached(text);

  let at = haystack.comparable.indexOf(needle);
  let length = needle.length;
  if (at < 0) {
    const words = needle.split(" ");
    let head = words.slice(0, HEAD_WORD_COUNT).join(" ");
    if (head.length < MINIMUM_HEAD_CHARACTERS) return undefined;
    at = haystack.comparable.indexOf(head);
    if (at < 0) return undefined;
    // Grow the match word by word as far as the text still agrees.
    for (const word of words.slice(HEAD_WORD_COUNT)) {
      const longer = `${head} ${word}`;
      if (!haystack.comparable.startsWith(longer, at)) break;
      head = longer;
    }
    length = head.length;
  }
  return {
    start: haystack.offsets[at],
    end: haystack.offsets[at + length - 1] + 1,
  };
}
