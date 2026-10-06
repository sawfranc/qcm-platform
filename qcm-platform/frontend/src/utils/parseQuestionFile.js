import { readSheet } from "read-excel-file/browser";

export const TEMPLATE_HEADERS = [
  "matiere", "thematique", "niveau", "enonce",
  "option_a", "option_b", "option_c", "option_d",
  "bonne_reponse", "explication", "difficulte",
];

// "Thématique" -> "thematique", " Option_A " -> "option_a"
function normHeader(h) {
  return String(h ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

// Lecteur CSV minimal : séparateur ; , ou tabulation, guillemets doublés, retours à la ligne dans les champs
function parseCsv(text) {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] || "";
  const delimiter = [";", "\t", ","].reduce((best, d) => (firstLine.split(d).length > firstLine.split(best).length ? d : best), ";");

  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"' && clean[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delimiter) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      rows.push(row); row = [];
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

/**
 * Lit un fichier .xlsx ou .csv et renvoie un tableau d'objets { matiere, thematique, ... }.
 * Les lignes entièrement vides sont ignorées, mais le numéro de ligne reste celui du fichier
 * (la 1re ligne de données est la ligne 2).
 */
export async function parseQuestionFile(file) {
  const isCsv = /\.(csv|txt)$/i.test(file.name);
  const matrix = isCsv ? parseCsv(await file.text()) : await readSheet(file);

  if (!matrix || matrix.length < 2) throw new Error("Le fichier est vide ou ne contient pas de ligne de données.");

  const headers = matrix[0].map(normHeader);
  const missing = ["matiere", "thematique", "niveau", "enonce", "option_a", "option_b", "bonne_reponse"].filter((h) => !headers.includes(h));
  if (missing.length) throw new Error(`Colonnes manquantes dans la première ligne : ${missing.join(", ")}.`);

  return matrix.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, i) => {
      if (h) obj[h] = cells[i] == null ? "" : String(cells[i]).trim();
    });
    return obj;
  });
}

export function downloadTemplate() {
  const example = [
    "Santé publique", "Système national d'information sanitaire (SNIS)", "Licence",
    "Que signifie le sigle CSPS ?",
    "Centre de santé et de promotion sociale", "Centre sanitaire de première sécurité", "Centre spécialisé de prévention sanitaire", "Comité de santé et de protection sociale",
    "A", "CSPS = Centre de santé et de promotion sociale.", "1",
  ];
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = "﻿" + [TEMPLATE_HEADERS, example].map((r) => r.map(esc).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "modele_import_questions.csv";
  a.click();
  URL.revokeObjectURL(url);
}
