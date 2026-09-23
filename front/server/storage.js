import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { db } from "./db.js";
import { APP_ROOT } from "./loadEnv.js";

// Fora do docroot por padrao (../storage a partir de front/), para que nenhum
// servidor estatico (Apache/LiteSpeed/express.static) consiga servir os
// arquivos direto — tudo passa pela rota autenticada /api/files.
const STORAGE_ROOT = path.resolve(APP_ROOT, process.env.STORAGE_DIR || "../storage");

const BUCKETS = ["creator-images", "rh-arquivos"];

const bucketDir = (bucket) => path.join(STORAGE_ROOT, bucket);

const ensureBucketDir = async (bucket) => {
  await fs.mkdir(bucketDir(bucket), { recursive: true });
};

const isValidBucket = (bucket) => BUCKETS.includes(bucket);

// Allowlist de tipo por bucket. O mime type que chega no upload e o que o
// NAVEGADOR do cliente declarou — nao prova nada sobre o conteudo real do
// arquivo, mas barra o caso obvio de alguem subir um .html/.svg/.js e a
// aplicacao devolver isso com Content-Type executavel na propria origem
// (stored XSS via anexo). Nada de html/svg/xml/script em nenhum bucket.
const ALLOWED_MIME_TYPES = {
  "rh-arquivos": new Set([
    "image/png", "image/jpeg", "image/gif", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
  ]),
  "creator-images": new Set(["image/png", "image/jpeg", "image/webp"]),
};

// So estes tipos sao seguros pra renderizar inline no navegador. Todo o
// resto sai com Content-Disposition: attachment (forca download, nunca
// executa/renderiza dentro da origem da aplicacao).
const INLINE_SAFE_MIME_TYPES = new Set([
  "image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf", "text/plain",
]);

export const isAllowedMimeType = (bucket, mimeType) => ALLOWED_MIME_TYPES[bucket]?.has(mimeType) ?? false;
export const isInlineSafeMimeType = (mimeType) => INLINE_SAFE_MIME_TYPES.has(mimeType);

/** Multer em memoria: arquivos sao pequenos (imagens/documentos de RH). */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES || 20 * 1024 * 1024) },
});

/** Salva um buffer no bucket, registra em stored_files, retorna a linha. */
export const saveFile = async ({ bucket, buffer, originalName, mimeType, ownerId }) => {
  if (!isValidBucket(bucket)) throw new Error(`Bucket invalido: ${bucket}`);
  if (!isAllowedMimeType(bucket, mimeType)) {
    throw Object.assign(new Error(`Tipo de arquivo nao permitido: ${mimeType}`), { code: "INVALID_MIME_TYPE" });
  }
  await ensureBucketDir(bucket);

  const ext = path.extname(originalName || "").slice(0, 10) || "";
  const storageKey = `${crypto.randomUUID()}${ext}`;
  const fullPath = path.join(bucketDir(bucket), storageKey);

  // Escreve so dentro do diretorio do bucket — sem travessia de path possivel
  // porque storageKey e gerado aqui, nunca vem do cliente.
  await fs.writeFile(fullPath, buffer);

  const id = crypto.randomUUID();
  await db.exec(
    `INSERT INTO stored_files (id, bucket, storage_key, original_name, mime_type, size_bytes, owner_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, bucket, storageKey, String(originalName || storageKey).slice(0, 255), mimeType || "application/octet-stream", buffer.length, ownerId || null],
  );

  return { id, bucket, storageKey, originalName, mimeType, sizeBytes: buffer.length, ownerId: ownerId || null };
};

export const getFileRow = async (id) => db.queryOne(`SELECT * FROM stored_files WHERE id = ?`, [id]);

export const readFileBuffer = async (bucket, storageKey) => {
  if (!isValidBucket(bucket)) throw new Error(`Bucket invalido: ${bucket}`);
  // storageKey vem do banco (nunca direto do request), mas normaliza mesmo
  // assim: sem separador de path, sem "..".
  const safeKey = path.basename(storageKey);
  return fs.readFile(path.join(bucketDir(bucket), safeKey));
};

export const deleteFile = async (id) => {
  const row = await getFileRow(id);
  if (!row) return;
  const safeKey = path.basename(row.storage_key);
  await fs.rm(path.join(bucketDir(row.bucket), safeKey), { force: true });
  await db.exec(`DELETE FROM stored_files WHERE id = ?`, [id]);
};

/** URL relativa servida pela rota autenticada — nunca um caminho de disco. */
export const fileUrl = (id) => `/api/files/${id}`;
