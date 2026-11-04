/**
 * Query-side synonym expansion for the paper search.
 *
 * Pagefind matches word prefixes and German stems, but has no synonyms and
 * cannot match inside a compound: "Kita" never finds a paper that only says
 * "Kindertagesstätte", and "Radweg" never finds "Fahrradweg". Expanding the
 * query in the browser fixes the most common cases without touching the
 * index. `searchPapers()` runs every variant and merges the results (see
 * `fuseQueryResults`).
 *
 * The list is deliberately small and hand-made. An entry only fires on an
 * exact, whole-word match, so partially typed words never expand. Measure
 * every change with `npm run eval:search`.
 */

/*
 * Pagefind's German stemmer already joins most inflections ("Schwimmbäder"
 * finds "Schwimmbad", "Flüchtling" finds "Flüchtlinge"), so a variant never
 * needs a plural of its own. Plural *keys* are still listed, because the key
 * has to equal the word the visitor typed.
 *
 * Measured and rejected (2026-11-04, papers a variant would add):
 * - Abfall → Müll: "müll" prefix-matches the surname Müller.
 * - Schwimmbad → Bäder: +5,085, mostly via "Baden".
 * - Senioren → ältere: +4,251 papers of noise.
 * - WLAN → Hotspot: mostly "Klima-Hotspots".
 * - Kfz/Pkw → Auto: Autobahn, Automotive.
 * - Bürgerbeteiligung ↔ Öffentlichkeitsbeteiligung: procedural wording in
 *   every Bebauungsplan.
 * - Straßenbahn ↔ Stadtbahn: different systems in Karlsruhe.
 * - Haushalt → Doppelhaushalt, Wohnraum → Wohnungsbau: already huge, related
 *   rather than equal.
 * - Sozialwohnung → sozialer Wohnungsbau, E-Scooter → E-Roller,
 *   Graffiti → Schmiererei: noisy or no gain.
 */

/** Words that mean the same thing; each one expands to all the others. */
const EQUIVALENT: readonly (readonly string[])[] = [
  ["kita", "kindertagesstätte"],
  ["kitas", "kindertagesstätten"],
  ["öpnv", "nahverkehr"],
  ["obdachlos", "wohnungslos"],
  ["obdachlose", "wohnungslose"],
  ["obdachlosen", "wohnungslosen"],
  ["obdachlosigkeit", "wohnungslosigkeit"],
  ["ampel", "lichtsignalanlage"],
  ["ampeln", "lichtsignalanlagen"],
  ["zebrastreifen", "fußgängerüberweg"],
  ["gehweg", "fußweg"],
  ["gehwege", "fußwege"],
  ["flüchtlinge", "geflüchtete"],
  ["flüchtling", "geflüchtete"],
  ["parkplatz", "stellplatz"],
  ["parkplätze", "stellplätze"],
  ["turnhalle", "sporthalle"],
  ["turnhallen", "sporthallen"],
  ["ladesäule", "ladestation", "ladeinfrastruktur"],
  ["ladesäulen", "ladestationen", "ladeinfrastruktur"],
  ["grünfläche", "grünanlage"],
  ["grünflächen", "grünanlagen"],
  ["toilette", "wc"],
  ["toiletten", "wc"],
  ["photovoltaik", "solar", "pv"],
];

/**
 * One-way expansions: a general word that should also find more specific
 * ones, or a compound the base word cannot reach by prefix. The reverse is
 * left out on purpose, since "Hallenbad" should not also find "Freibad".
 * Everyday words and abbreviations also point one way to the official term.
 */
const NARROWER: Readonly<Record<string, readonly string[]>> = {
  // Never the reverse: Pagefind splits a hyphenated variant ("b-plan",
  // "e-mobilität") at the hyphen, and a one-letter word matches almost
  // everything (it cost "Bebauungsplan Durlach" an on-topic hit).
  "b-plan": ["bebauungsplan"],
  "b-pläne": ["bebauungspläne"],
  "e-mobilität": ["elektromobilität"],
  "pv-anlage": ["photovoltaik"],
  "pv-anlagen": ["photovoltaik"],
  solaranlage: ["photovoltaik", "pv"],
  solaranlagen: ["photovoltaik", "pv"],
  kita: ["kindergarten"],
  kindertagesstätte: ["kindergarten"],
  schwimmbad: ["hallenbad", "freibad"],
  schwimmbäder: ["hallenbad", "freibad"],
  radweg: ["fahrradweg"],
  radwege: ["fahrradwege"],
  fahrrad: ["radverkehr"],
  spielplatz: ["kinderspielplatz"],
  spielplätze: ["kinderspielplätze"],
  müll: ["abfall"],
  bürgersteig: ["gehweg"],
  tram: ["straßenbahn", "stadtbahn"],
  hbf: ["hauptbahnhof"],
  lastwagen: ["lkw"],
  kvv: ["verkehrsverbund"],
  vbk: ["verkehrsbetriebe"],
  asylbewerber: ["flüchtlinge", "geflüchtete"],
};

/** Each variant costs one extra Pagefind search. */
export const MAX_QUERY_VARIANTS = 4;

const ALTERNATIVES: ReadonlyMap<string, readonly string[]> = (() => {
  const map = new Map<string, string[]>();
  const add = (word: string, alternatives: readonly string[]) => {
    const list = map.get(word) ?? [];
    for (const alternative of alternatives)
      if (alternative !== word && !list.includes(alternative))
        list.push(alternative);
    map.set(word, list);
  };
  for (const group of EQUIVALENT) for (const word of group) add(word, group);
  for (const [word, alternatives] of Object.entries(NARROWER))
    add(word, alternatives);
  return map;
})();

const lower = (value: string) => value.toLocaleLowerCase("de-DE");

/**
 * Returns the alternative queries for `query`, without the query itself.
 * Each variant replaces one word, so every other word still has to match
 * (Pagefind ANDs the words of a query).
 */
export function expandQuery(query: string): string[] {
  const words = lower(query).trim().split(/\s+/).filter(Boolean);
  const original = words.join(" ");
  const variants: string[] = [];
  for (const [index, word] of words.entries()) {
    for (const alternative of ALTERNATIVES.get(word) ?? []) {
      const variant = words
        .map((other, position) => (position === index ? alternative : other))
        .join(" ");
      if (variant !== original && !variants.includes(variant))
        variants.push(variant);
      if (variants.length >= MAX_QUERY_VARIANTS) return variants;
    }
  }
  return variants;
}
