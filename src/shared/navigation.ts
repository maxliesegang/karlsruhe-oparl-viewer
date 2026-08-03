export type NavigationSection =
  "search" | "papers" | "meetings" | "districts" | "submitters" | "saved";

export interface NavigationItem {
  section: NavigationSection;
  label: string;
  path: string;
}

export const primaryNavigation: NavigationItem[] = [
  {
    section: "papers",
    label: "Vorlagen",
    path: "vorlagen",
  },
  {
    section: "meetings",
    label: "Sitzungen",
    path: "sitzungen",
  },
  {
    section: "districts",
    label: "Stadtteile",
    path: "stadtteile",
  },
  {
    section: "submitters",
    label: "Fraktionen",
    path: "fraktionen",
  },
];

export const utilityNavigation: NavigationItem[] = [
  {
    section: "search",
    label: "Suche",
    path: "",
  },
  {
    section: "saved",
    label: "Gespeichert",
    path: "gespeicherte-suchen",
  },
];
