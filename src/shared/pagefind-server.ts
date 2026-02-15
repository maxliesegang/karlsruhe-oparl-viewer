import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { isPagefindEnabled } from "./pagefind-config";

const SEARCH_DISABLED_BY_SKIP_MESSAGE =
  "Suche ist in diesem schnellen Build deaktiviert (SKIP_PAGEFIND=1).";
const SEARCH_DISABLED_BY_MISSING_DEV_INDEX_MESSAGE =
  "Suche ist im Dev-Server deaktiviert, weil kein lokaler Pagefind-Index gefunden wurde.";

export interface PagefindAvailability {
  enabled: boolean;
  enabledByEnv: boolean;
  hasLocalIndex: boolean;
  disabledMessage: string;
}

interface ResolvePagefindAvailabilityOptions {
  isDev: boolean;
  cwd?: string;
}

export function resolvePagefindAvailability(
  skipPagefindValue: unknown,
  options: ResolvePagefindAvailabilityOptions,
): PagefindAvailability {
  const enabledByEnv = isPagefindEnabled(skipPagefindValue);
  const cwd = options.cwd ?? process.cwd();
  const hasLocalIndex =
    !options.isDev || existsSync(resolve(cwd, "dist/pagefind/pagefind.js"));
  const enabled = enabledByEnv && hasLocalIndex;

  return {
    enabled,
    enabledByEnv,
    hasLocalIndex,
    disabledMessage: enabledByEnv
      ? SEARCH_DISABLED_BY_MISSING_DEV_INDEX_MESSAGE
      : SEARCH_DISABLED_BY_SKIP_MESSAGE,
  };
}
