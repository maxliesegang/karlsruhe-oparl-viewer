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

async function loadFileText(target: HTMLElement): Promise<void> {
  const fileId = target.dataset.fileId;
  const state = target.dataset.fileTextState;

  if (!fileId || state === "loading" || state === "loaded") return;
  if (isAlreadyInlined(target)) return;

  setState(target, "loading");
  target.textContent = LOADING_MESSAGE;

  const source = buildFileTextUrl(fileId);
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
