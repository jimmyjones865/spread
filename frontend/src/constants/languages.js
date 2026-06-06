export const LANGUAGES = [
  "English", "Japanese", "German", "French", "Italian", "Spanish",
  "Dutch", "Swedish", "Norwegian", "Danish", "Finnish", "Korean",
  "Chinese", "Portuguese", "Polish", "Czech", "Russian", "Arabic",
  "Turkish", "Greek", "Hungarian", "Romanian", "Ukrainian", "Hebrew",
  "Persian", "Catalan",
];

export const LANG_CODE_MAP = {
  en: "English", ja: "Japanese", de: "German", fr: "French", it: "Italian",
  es: "Spanish", nl: "Dutch", sv: "Swedish", no: "Norwegian", da: "Danish",
  fi: "Finnish", ko: "Korean", zh: "Chinese", pt: "Portuguese", pl: "Polish",
  cs: "Czech", ru: "Russian", ar: "Arabic", tr: "Turkish", el: "Greek",
  hu: "Hungarian", ro: "Romanian", uk: "Ukrainian", he: "Hebrew", fa: "Persian",
  ca: "Catalan",
};

export function parseLanguages(str) {
  if (!str) return [];
  return str.split(/\s*[\/,]\s*/)
    .map(s => LANG_CODE_MAP[s.trim().toLowerCase()] || s.trim())
    .filter(Boolean);
}
