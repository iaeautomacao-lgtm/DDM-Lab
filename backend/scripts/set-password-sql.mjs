#!/usr/bin/env node
// Gera o SQL pra definir a senha de um usuario direto no MariaDB (phpMyAdmin),
// sem depender do fluxo "Esqueci minha senha" (que precisa de SMTP).
//
//   node backend/scripts/set-password-sql.mjs
//
// Pergunta e-mail e senha (a senha nao aparece na tela) e imprime um UPDATE.
// A senha em si nunca sai desta maquina — so o hash bcrypt.

import path from "path";
import readline from "readline";
import { createRequire } from "module";
import { fileURLToPath } from "url";

// bcryptjs e o mesmo do app (front/node_modules) — mesmo formato de hash.
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const requireFromFront = createRequire(path.resolve(SCRIPT_DIR, "../../front/package.json"));
const bcrypt = requireFromFront("bcryptjs");

const isTTY = Boolean(process.stdin.isTTY);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: isTTY });

// Em terminal de verdade, esconde a digitacao da senha trocando o eco por *.
let muted = false;
if (isTTY) {
  const write = rl._writeToOutput.bind(rl);
  rl._writeToOutput = (text) => {
    if (!muted) return write(text);
    if (text.includes("\n") || text.includes("\r")) return write("\n");
    return write("*");
  };
}

// Iterador de linhas: funciona tanto digitando quanto com entrada via pipe.
const lines = rl[Symbol.asyncIterator]();
const ask = async (question, hidden = false) => {
  process.stdout.write(question);
  muted = hidden;
  const { value } = await lines.next();
  muted = false;
  return value ?? "";
};

const email = (await ask("E-mail: ")).trim().toLowerCase();
const password = await ask("Senha nova (min. 6): ", true);
const confirm = await ask("Repita a senha: ", true);
rl.close();

if (!email.includes("@")) {
  console.error("E-mail invalido.");
  process.exit(1);
}
if (password.length < 6) {
  console.error("Senha precisa ter pelo menos 6 caracteres.");
  process.exit(1);
}
if (password !== confirm) {
  console.error("As senhas nao conferem.");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
const sqlString = (value) => `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;

console.log("\nCole no phpMyAdmin (banco grpia_labs, aba SQL):\n");
console.log(
  `UPDATE users SET password_hash = ${sqlString(hash)}, failed_logins = 0, locked_until = NULL WHERE email = ${sqlString(email)};`,
);
console.log("");
