import { readFileText } from "./file-text-loader";
import {
  FILE_TEXT_HASH_PREFIX as HASH_PREFIX,
  getFileTextStats,
  normalizeQuery,
  segmentFileText,
} from "./file-text-segments";

/**
 * Full-screen reader for an attachment's extracted text, opened from the
 * "Vollansicht" link on an `AuxiliaryFiles` card.
 *
 * The URL hash is the state: `#text-<fileId>` (the mirror's file id, as in
 * `data-file-id`) opens the reader, so the view is directly linkable and the
 * back button closes it. Text comes from `readFileText`, i.e. the same fetch —
 * and the same dev-server inlining — as the card's own disclosure.
 *
 * Fetched text is only ever written with `textContent` / text nodes.
 */

const CARD_SELECTOR = "#paper-files .file-item";
const SEARCH_DELAY_MS = 150;
const COPY_FEEDBACK_MS = 2000;

const LOADING_MESSAGE = "Text wird geladen …";
const ERROR_MESSAGE =
  "Der extrahierte Text konnte nicht geladen werden. Die Datei lässt sich weiterhin herunterladen.";

const numberFormat = new Intl.NumberFormat("de-DE");

function fileIdFromHash(): string | null {
  if (!location.hash.startsWith(HASH_PREFIX)) return null;
  try {
    return decodeURIComponent(location.hash.slice(HASH_PREFIX.length)) || null;
  } catch {
    return null;
  }
}

interface CardSource {
  name: string;
  href: string | undefined;
  target: HTMLElement;
}

/** The attachment card that owns `fileId`, read back from its markup. */
function findCardSource(fileId: string): CardSource | null {
  const target = document.querySelector<HTMLElement>(
    `${CARD_SELECTOR} [data-file-text][data-file-id="${CSS.escape(fileId)}"]`,
  );
  const card = target?.closest<HTMLElement>(".file-item");
  if (!target || !card) return null;
  const link = card.querySelector<HTMLAnchorElement>(".file-name");
  return {
    name: link?.textContent?.trim() || "Anhang",
    href: link?.href,
    target,
  };
}

function query<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`File reader is missing ${selector}`);
  return element;
}

export function initFileTextReader(): void {
  const dialog =
    document.querySelector<HTMLDialogElement>("[data-file-reader]");
  if (!dialog) return;

  const title = query<HTMLElement>(dialog, "[data-reader-title]");
  const meta = query<HTMLElement>(dialog, "[data-reader-meta]");
  const original = query<HTMLAnchorElement>(dialog, "[data-reader-original]");
  const copyButton = query<HTMLButtonElement>(dialog, "[data-reader-copy]");
  const closeButton = query<HTMLButtonElement>(dialog, "[data-reader-close]");
  const search = query<HTMLInputElement>(dialog, "[data-reader-search]");
  const count = query<HTMLElement>(dialog, "[data-reader-count]");
  const previous = query<HTMLButtonElement>(dialog, "[data-reader-previous]");
  const next = query<HTMLButtonElement>(dialog, "[data-reader-next]");
  const body = query<HTMLElement>(dialog, "[data-reader-body]");
  const output = query<HTMLElement>(dialog, "[data-reader-text]");
  const copyLabel = copyButton.textContent?.trim() ?? "";

  let currentFileId: string | null = null;
  let text = "";
  let matches: HTMLElement[] = [];
  let activeMatch = -1;
  let searchTimer: number | undefined;
  let copyTimer: number | undefined;
  /** Whether opening pushed a history entry that closing should pop. */
  let openedByNavigation = false;

  function setStatus(message: string, state: "loading" | "error"): void {
    output.dataset.state = state;
    output.textContent = message;
    meta.textContent = "";
    search.disabled = true;
    updateCount();
  }

  function updateCount(): void {
    const hasQuery = normalizeQuery(search.value) !== "";
    count.textContent = !hasQuery
      ? ""
      : matches.length === 0
        ? "Keine Treffer"
        : `${activeMatch + 1} / ${matches.length}`;
    previous.disabled = next.disabled = matches.length === 0;
  }

  function selectMatch(index: number): void {
    matches[activeMatch]?.classList.remove("is-active");
    if (matches.length === 0) {
      activeMatch = -1;
    } else {
      activeMatch = (index + matches.length) % matches.length;
      const mark = matches[activeMatch];
      mark.classList.add("is-active");
      mark.scrollIntoView({ block: "center" });
    }
    updateCount();
  }

  function renderText(): void {
    const fragment = document.createDocumentFragment();
    matches = [];
    for (const segment of segmentFileText(text, search.value)) {
      if (segment.kind === "text") {
        fragment.append(segment.text);
      } else if (segment.kind === "match") {
        const mark = document.createElement("mark");
        mark.className = "reader-match";
        mark.textContent = segment.text;
        matches.push(mark);
        fragment.append(mark);
      } else {
        const divider = document.createElement("span");
        divider.className = "reader-page-break";
        divider.setAttribute("role", "separator");
        divider.textContent = `Seite ${segment.page} von ${segment.total}`;
        fragment.append(divider);
      }
    }
    delete output.dataset.state;
    output.replaceChildren(fragment);
    activeMatch = -1;
    if (matches.length > 0) selectMatch(0);
    else updateCount();
  }

  async function open(fileId: string, source: CardSource): Promise<void> {
    currentFileId = fileId;
    title.textContent = source.name;
    original.hidden = !source.href;
    if (source.href) original.href = source.href;
    search.value = "";
    text = "";
    matches = [];
    setStatus(LOADING_MESSAGE, "loading");

    if (!dialog!.open) dialog!.showModal();
    // Arrow keys and space scroll the text right away; the search field would
    // pop up the keyboard on phones.
    body.scrollTop = 0;
    body.focus({ preventScroll: true });

    const loaded = await readFileText(source.target);
    if (currentFileId !== fileId) return; // Another file was opened meanwhile.
    if (loaded === null) {
      setStatus(ERROR_MESSAGE, "error");
      return;
    }

    text = loaded;
    const stats = getFileTextStats(text);
    meta.textContent = [
      stats.pages &&
        `${numberFormat.format(stats.pages)} ${stats.pages === 1 ? "Seite" : "Seiten"}`,
      `${numberFormat.format(stats.words)} Wörter`,
    ]
      .filter(Boolean)
      .join(" · ");
    search.disabled = false;
    renderText();
  }

  /** Brings the dialog in line with the URL hash. */
  function sync(fromNavigation: boolean): void {
    const fileId = fileIdFromHash();
    const source = fileId ? findCardSource(fileId) : null;
    if (fileId && source) {
      if (!dialog!.open) openedByNavigation = fromNavigation;
      if (fileId !== currentFileId || !dialog!.open) void open(fileId, source);
    } else if (dialog!.open) {
      dialog!.close();
    }
  }

  dialog.addEventListener("close", () => {
    currentFileId = null;
    window.clearTimeout(searchTimer);
    searchTimer = undefined;
    // Closing by Esc, button, or backdrop drops the hash again: popping the
    // entry the link pushed, or — for a page opened on a deep link — replacing
    // it so reloading does not reopen the reader.
    if (fileIdFromHash()) {
      if (openedByNavigation) history.back();
      else
        history.replaceState(
          history.state,
          "",
          location.pathname + location.search,
        );
    }
  });

  // The dialog has no padding, so a click on the element itself is the backdrop.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  closeButton.addEventListener("click", () => dialog.close());

  search.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      searchTimer = undefined;
      renderText();
    }, SEARCH_DELAY_MS);
  });
  search.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    // Enter before the debounce fires should still search, not step.
    if (searchTimer !== undefined) {
      window.clearTimeout(searchTimer);
      searchTimer = undefined;
      renderText();
      return;
    }
    selectMatch(activeMatch + (event.shiftKey ? -1 : 1));
  });
  previous.addEventListener("click", () => selectMatch(activeMatch - 1));
  next.addEventListener("click", () => selectMatch(activeMatch + 1));

  copyButton.addEventListener("click", async () => {
    let label: string;
    try {
      await navigator.clipboard.writeText(location.href);
      label = "Link kopiert";
    } catch {
      label = "Kopieren nicht möglich";
    }
    copyButton.textContent = label;
    window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => {
      copyButton.textContent = copyLabel;
    }, COPY_FEEDBACK_MS);
  });

  window.addEventListener("hashchange", () => sync(true));
  sync(false);
}
