import mammoth from "mammoth";
// NAO importar de "pdf-parse" direto: o index.js daquele pacote (v1.1.1) tem
// codigo de debug que acha que esta rodando "standalone" sob ESM (checa
// module.parent, que e sempre undefined aqui) e tenta ler um arquivo de
// teste que nao existe, derrubando o import. O modulo de verdade esta em
// pdf-parse/lib/pdf-parse.js, sem esse problema.
import pdfParse from "pdf-parse/lib/pdf-parse.js";

// Limite de texto que entra no prompt da IA — documento grande vira custo e
// contexto demais, 18k caracteres já cobre um relatorio de varias paginas.
const MAX_TEXT_LENGTH = 18000;

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME = "application/pdf";

export const SUPPORTED_DOCUMENT_MIME_TYPES = new Set([DOCX_MIME, PDF_MIME]);

/**
 * Extrai o texto puro de um .docx ou .pdf enviado pelo usuario. Nunca salva
 * o arquivo em disco nem no banco — so usa o texto por uma chamada, depois
 * descarta (a apresentacao gerada e o que fica salvo, nao o documento fonte).
 */
export const extractDocumentText = async (buffer, mimeType) => {
  let text = "";

  if (mimeType === DOCX_MIME) {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value || "";
  } else if (mimeType === PDF_MIME) {
    const result = await pdfParse(buffer);
    text = result.text || "";
  } else {
    throw Object.assign(new Error("Formato nao suportado. Envie um .docx ou .pdf."), { code: "UNSUPPORTED_FORMAT" });
  }

  text = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  if (!text) {
    throw Object.assign(new Error("Nao foi possivel extrair texto desse arquivo."), { code: "EMPTY_DOCUMENT" });
  }

  return text.slice(0, MAX_TEXT_LENGTH);
};
