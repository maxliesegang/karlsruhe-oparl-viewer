import { findQuoteRange } from "./quote-match";
import { buildFileTextUrl } from "./utils";

/**
 * Loads a file's extracted PDF text on demand.
 *
 * The text is rendered into the page at build time so that Pagefind indexes it,
 * and the `pagefind-lean` integration then empties the container in the written
 * HTML (see `integrations/pagefind-lean.mjs`) — that is what keeps ~276 MB of
 * extracted text out of `dist/`. A built page therefore carries an empty
 * container plus the file id, and this controller fills it the first time a
 * reader opens the disclosure.
 *
 * An empty container is exactly the signal that stripping ran. Under `astro dev`
 * no integration runs, the text is already inlined, and nothing is fetched.
 */

const TEXT_SELECTOR = "[data-file-text]";
const DETAILS_SELECTOR = "[data-file-text-details]";
/** An attachment card; `data-id` holds the OParl `File` id. */
const CARD_SELECTOR = "#paper-files .file-item";
const PASSAGE_CLASS = "source-passage";

const LOADING_MESSAGE = "Text wird geladen …";
const ERROR_MESSAGE =
  "Der extrahierte Text konnte nicht geladen werden. Die Datei lässt sich weiterhin herunterladen.";

type LoadState = "loading" | "loaded" | "error";

function setState(target: HTMLElement, state: LoadState): void {
  target.dataset.fileTextState = state;
}

/** True while the container still holds the build-time text (dev server). */
function isAlreadyInlined(target: HTMLElement): boolean {
  return (
    target.dataset.fileTextState === undefined &&
    (target.textContent ?? "").trim() !== ""
  );
}

const pendingLoads = new WeakMap<HTMLElement, Promise<void>>();

/** Resolves once the text is in place (or the load failed); never rejects. */
function loadFileText(target: HTMLElement): Promise<void> {
  const fileId = target.dataset.fileId;
  const state = target.dataset.fileTextState;

  if (state === "loading") return pendingLoads.get(target) ?? Promise.resolve();
  if (!fileId || state === "loaded") return Promise.resolve();
  if (isAlreadyInlined(target)) return Promise.resolve();

  setState(target, "loading");
  target.textContent = LOADING_MESSAGE;

  const source = buildFileTextUrl(fileId);
  const load = (async () => {
    try {
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      // `textContent` keeps this plain text: the response is a third-party
      // document and must never be parsed as HTML.
      target.textContent = await response.text();
      setState(target, "loaded");
    } catch (error) {
      console.warn(`Could not load extracted text from ${source}`, error);
      target.textContent = ERROR_MESSAGE;
      setState(target, "error");
    }
  })();
  pendingLoads.set(target, load);
  return load;
}

/**
 * Wraps `quote` in a `<mark>`, replacing an earlier one. The container holds
 * plain text only, so it is rebuilt from its own text rather than patched.
 */
function markPassage(target: HTMLElement, quote: string): HTMLElement | null {
  const text = target.textContent ?? "";
  const range = findQuoteRange(text, quote);
  if (!range) {
    target.textContent = text;
    return null;
  }
  const mark = document.createElement("mark");
  mark.className = PASSAGE_CLASS;
  mark.tabIndex = -1;
  mark.textContent = text.slice(range.start, range.end);
  target.replaceChildren(
    text.slice(0, range.start),
    mark,
    text.slice(range.end),
  );
  return mark;
}

/**
 * Shows the passage a summary key point rests on: scrolls to the attachment's
 * card, opens its text, and highlights `quote` in it. Resolves `false` when the
 * page has no card for `fileId`. A failed load or a quote that is not in the
 * text leaves the reader at the opened card.
 */
export async function showFilePassage(
  fileId: string,
  quote: string,
): Promise<boolean> {
  const card = document.querySelector<HTMLElement>(
    `${CARD_SELECTOR}[data-id="${CSS.escape(fileId)}"]`,
  );
  const details = card?.querySelector<HTMLDetailsElement>(DETAILS_SELECTOR);
  const target = details?.querySelector<HTMLElement>(TEXT_SELECTOR);
  if (!card || !details || !target) return false;

  // Scroll first so the click has a visible effect while the text loads.
  card.scrollIntoView({ block: "start" });
  details.open = true;
  await loadFileText(target);
  if (target.dataset.fileTextState === "error") return true;

  const mark = markPassage(target, quote);
  mark?.scrollIntoView({ block: "center" });
  mark?.focus({ preventScroll: true });
  return true;
}

/**
 * Wires every disclosure in `root`. Fetching starts on the first open; a failed
 * attempt is retried on the next open, since the usual cause is transient.
 */
export function initFileTextLoaders(root: ParentNode = document): void {
  for (const details of root.querySelectorAll<HTMLDetailsElement>(
    DETAILS_SELECTOR,
  )) {
    const target = details.querySelector<HTMLElement>(TEXT_SELECTOR);
    if (!target) continue;

    details.addEventListener("toggle", () => {
      if (details.open) void loadFileText(target);
    });

    // Find-in-page and deep links can open a disclosure before this runs.
    if (details.open) void loadFileText(target);
  }
}
