import * as XLSX from "xlsx";
import Papa from "papaparse";

// Leitura de planilha/CSV enviada pro DDM Dashboards. Roda no servidor (nao
// no navegador) pelo mesmo motivo do documentExtract.js/pptxPatternExtractor.js:
// a lib (xlsx) tem uma CVE conhecida de prototype-pollution sem fix no npm —
// melhor rodar controlado no processo do que no bundle do navegador. A guarda
// anti-prototype-pollution abaixo (normalizeRows) mitiga o risco de verdade.

export const MAX_ROWS = 50000;

const SUPPORTED_EXTENSIONS = new Set(["csv", "txt", "xlsx", "xls", "json"]);

const pad = (n) => String(n).padStart(2, "0");

// Componentes locais, nao toISOString(), pra nao deslocar o dia por fuso.
const dateToISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const normalizeCell = (v) => {
  if (v == null || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : dateToISO(v);
  if (typeof v === "number") return v;
  return String(v);
};

const normalizeRows = (raw) => {
  const truncated = raw.length > MAX_ROWS;
  const limited = truncated ? raw.slice(0, MAX_ROWS) : raw;
  const colSet = new Set();
  const rows = limited.map((r) => {
    const row = {};
    for (const [k, v] of Object.entries(r)) {
      const key = k.trim();
      if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
      colSet.add(key);
      row[key] = normalizeCell(v);
    }
    return row;
  });
  return { rows, columns: Array.from(colSet), truncated };
};

const parseCSVText = (text) =>
  new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (res) => resolve(res.data),
      error: (err) => reject(err),
    });
  });

/** Extensao a partir do nome original enviado (nao confia em mimetype do navegador). */
export const fileExtension = (fileName) => (fileName.split(".").pop() || "").toLowerCase();

export const isSupportedSpreadsheet = (fileName) => SUPPORTED_EXTENSIONS.has(fileExtension(fileName));

/** Parseia um buffer (csv/txt/json/xlsx/xls) em linhas normalizadas. */
export const parseSpreadsheetBuffer = async (buffer, fileName) => {
  const ext = fileExtension(fileName);

  if (ext === "csv" || ext === "txt") {
    const data = await parseCSVText(buffer.toString("utf8"));
    const { rows, columns, truncated } = normalizeRows(data);
    return { fileName, rows, columns, truncated };
  }

  if (ext === "json") {
    const parsed = JSON.parse(buffer.toString("utf8"));
    const arr = Array.isArray(parsed) ? parsed : parsed.data ?? [];
    const { rows, columns, truncated } = normalizeRows(arr);
    return { fileName, rows, columns, truncated };
  }

  if (ext === "xlsx" || ext === "xls") {
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
    const { rows, columns, truncated } = normalizeRows(data);
    return { fileName, rows, columns, truncated, sheetName };
  }

  throw Object.assign(new Error(`Formato nao suportado: .${ext}. Use CSV, XLSX, XLS ou JSON.`), { code: "UNSUPPORTED_FORMAT" });
};

// ---------- perfilamento das colunas (porte 1:1 de profileColumns.ts) ----------

const DATE_RE = [/^\d{4}-\d{2}-\d{2}/, /^\d{2}\/\d{2}\/\d{4}$/, /^\d{2}-\d{2}-\d{4}$/];
const CURRENCY_NAME = /(valor|preco|preço|total|receita|montante|pago|saldo|ticket|custo|cpc|cpl|cac|roas|faturamento)/i;
const ID_NAME = /(cpf|cnpj|id|matricula|matrícula|codigo|código|protocolo|documento)/i;

export const parseNumber = (v) => {
  if (typeof v === "number") return isNaN(v) ? null : v;
  if (typeof v !== "string") return null;
  let s = v.trim();
  if (!s) return null;
  s = s.replace(/[R$€£%\s ]/gi, "").replace(/US\$?/gi, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};

const isDateValue = (v) => DATE_RE.some((re) => re.test(v.trim()));

const detectType = (name, values) => {
  if (values.length === 0) return "text";
  if (values.every(isDateValue)) return "date";

  const numeric = values.every((v) => parseNumber(v) !== null);
  if (numeric) return CURRENCY_NAME.test(name) ? "currency" : "number";

  if (ID_NAME.test(name)) return "id";

  const distinct = new Set(values).size;
  const ratio = distinct / values.length;
  if (distinct <= 50 && ratio < 0.5) return "category";
  if (ratio > 0.9) return "id";
  return "text";
};

const roleForType = (t) => {
  switch (t) {
    case "date":
      return "date";
    case "number":
    case "currency":
      return "metric";
    case "category":
    case "id":
      return "dimension";
    default:
      return "ignore";
  }
};

/** Perfila cada coluna (tipo, papel, nulos, duplicados, avisos). A IA so usa colunas deste perfil. */
export const profileColumns = (rows, columns) => {
  const total = rows.length;

  const seen = new Set();
  let dupRows = 0;
  for (const r of rows) {
    const key = JSON.stringify(columns.map((c) => r[c]));
    if (seen.has(key)) dupRows++;
    else seen.add(key);
  }

  return columns.map((col) => {
    const all = rows.map((r) => r[col]);
    const nonNull = all.filter((v) => v !== null && v !== undefined && v !== "");
    const asStrings = nonNull.map((v) => String(v));
    const nullCount = total - nonNull.length;
    const distinctCount = new Set(asStrings).size;

    const dataType = detectType(col, asStrings);
    const role = roleForType(dataType);

    const issues = [];
    if (nullCount > 0) issues.push(`${nullCount} valores vazios`);
    if (dupRows > 0) issues.push(`${dupRows} linhas duplicadas (na base)`);

    if (dataType !== "date") {
      const dateLike = asStrings.filter(isDateValue).length;
      if (dateLike > 0 && dateLike < asStrings.length && dateLike / asStrings.length > 0.5) {
        issues.push(`${asStrings.length - dateLike} datas invalidas`);
      }
    }
    if (dataType === "category") {
      const lowerDistinct = new Set(asStrings.map((s) => s.toLowerCase())).size;
      if (lowerDistinct < distinctCount) issues.push("variacoes de maiusculas/minusculas");
    }

    return {
      originalName: col,
      semanticName: col,
      dataType,
      role,
      sampleValues: Array.from(new Set(asStrings)).slice(0, 4),
      nullCount,
      distinctCount,
      issues,
    };
  });
};
