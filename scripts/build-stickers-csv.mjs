import fs from "fs";
import path from "path";

const SOURCE_URL =
  "https://www.worldtradingcards.com/collections/panini-fifa-world-cup-2026-stickers";

const OUTPUT_DIR = path.join(process.cwd(), "supabase");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "stickers_worldcup2026.csv");

function decodeHtml(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&eacute;/g, "é")
    .replace(/&Eacute;/g, "É")
    .replace(/&aacute;/g, "á")
    .replace(/&Aacute;/g, "Á")
    .replace(/&iacute;/g, "í")
    .replace(/&Iacute;/g, "Í")
    .replace(/&oacute;/g, "ó")
    .replace(/&Oacute;/g, "Ó")
    .replace(/&uacute;/g, "ú")
    .replace(/&Uacute;/g, "Ú")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&Ntilde;/g, "Ñ")
    .replace(/&uuml;/g, "ü")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&ouml;/g, "ö")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&ccedil;/g, "ç")
    .replace(/&Ccedil;/g, "Ç")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function htmlToText(html) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h1|h2|h3|h4|span|a)>/gi, "\n")
      .replace(/<[^>]*>/g, " ")
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s+/g, "\n")
  );
}

function csvValue(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function normalizeType(type) {
  const clean = type.trim();

  if (clean.toLowerCase() === "foil") return "Foil";
  if (clean.toLowerCase() === "silver") return "Silver";

  return clean;
}

function inferSection(code, team, type) {
  if (code === "PL000") return "We Are Panini";
  if (code.startsWith("FWC")) return team;
  if (code.startsWith("CC-")) return "Coca Cola";
  if (code.endsWith("mc")) return "McDonald's Exclusive";
  if (["LM", "JD", "VJ", "AD", "LD", "LMO", "MC", "MS", "JB", "KM", "FW", "RJ", "AH", "EH", "RL", "CR", "HS", "LY", "CP", "FV"].some((prefix) => code === prefix || code.startsWith(`${prefix}-`))) {
    return "Extra Stickers";
  }

  return team;
}

function parseChecklist(text) {
  const startMarker = "Checklist Completo Panini FIFA World Cup 2026 Stickers";
  const startIndex = text.indexOf(startMarker);

  if (startIndex === -1) {
    throw new Error("No encontré el inicio de la checklist en la página.");
  }

  const afterStart = text.slice(startIndex);
  const endIndex = afterStart.indexOf("Ver mas");

  if (endIndex === -1) {
    throw new Error("No encontré el final de la checklist en la página.");
  }

  const checklistText = afterStart.slice(0, endIndex);

  const lines = checklistText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const rows = [];

  for (const line of lines) {
    if (!line.includes(" - ")) continue;
    if (line.startsWith("Checklist Completo")) continue;

    const parts = line.split(" - ").map((part) => part.trim());

    if (parts.length < 4) continue;

    const number = parts[0];
    const type = normalizeType(parts[parts.length - 1]);
    const team = parts[parts.length - 2];
    const name = parts.slice(1, -2).join(" - ");
    const section = inferSection(number, team, type);

    const validCode =
      /^[A-Z]{2,5}\d{3}[a-z]*$/.test(number) ||
      /^CC-[A-Z]{2,3}\d{3}$/.test(number) ||
      /^[A-Z]{2,4}13mc$/.test(number) ||
      /^[A-Z]{1,4}(-[bsg])?$/.test(number) ||
      number === "PL000";

    if (!validCode) continue;

    rows.push({
      id: rows.length + 1,
      number,
      name,
      team,
      section,
      type,
      sort_order: rows.length + 1,
      owned: false,
      duplicates: 0,
    });
  }

  const unique = new Map();

  for (const row of rows) {
    unique.set(row.number, row);
  }

  return Array.from(unique.values()).map((row, index) => ({
    ...row,
    id: index + 1,
    sort_order: index + 1,
  }));
}

async function main() {
  console.log("Descargando checklist...");
  const response = await fetch(SOURCE_URL, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; AlbumMundial2026CSVBuilder/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`No pude descargar la página. Status: ${response.status}`);
  }

  const html = await response.text();
  const text = htmlToText(html);
  const rows = parseChecklist(text);

  if (rows.length < 900) {
    console.warn(
      `Advertencia: solo se generaron ${rows.length} filas. Revisa la fuente antes de importar.`
    );
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const headers = [
    "id",
    "number",
    "name",
    "team",
    "section",
    "type",
    "sort_order",
    "owned",
    "duplicates",
  ];

  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header];

          if (typeof value === "boolean") return value ? "true" : "false";
          if (typeof value === "number") return String(value);

          return csvValue(value);
        })
        .join(",")
    ),
  ].join("\n");

  fs.writeFileSync(OUTPUT_FILE, csv, "utf8");

  console.log(`CSV creado: ${OUTPUT_FILE}`);
  console.log(`Total de stickers: ${rows.length}`);
  console.log("Primeros 5:");
  console.table(rows.slice(0, 5));
  console.log("Últimos 5:");
  console.table(rows.slice(-5));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});