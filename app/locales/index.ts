import en from "./en.json";
import zh from "./zh.json";

export const locales = { en, zh } as const;

export type Language = keyof typeof locales;
export type Translations = typeof en;
