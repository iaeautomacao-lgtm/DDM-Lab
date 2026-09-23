import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Precisa ser o PRIMEIRO import em server.js. Em ES modules, todo import e
// avaliado (dependencias primeiro, depois o corpo do modulo) antes do corpo
// do arquivo que importa rodar — entao um dotenv.config() escrito DEPOIS dos
// imports de ./db.js / ./authCore.js / ./routes.js roda tarde demais: esses
// modulos ja teriam lido process.env vazio no proprio carregamento (o pool
// do mysql2 e o fail-fast do JWT, por exemplo). Import de efeito colateral,
// sem dependencias, executa imediatamente e garante a ordem certa.
//
// Caminho resolvido a partir DESTE arquivo (front/server/), nao do diretorio
// atual: o Passenger do cPanel nao garante que o processo inicie com cwd na
// raiz do app.
export const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

dotenv.config({ path: path.resolve(APP_ROOT, "../backend/.env.local") });
