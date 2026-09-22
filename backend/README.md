# DDM Lab — backend (MariaDB)

O app saiu do Supabase. Autenticacao, banco e storage agora sao proprios,
rodando dentro do mesmo processo Node do cPanel (`front/server.js`).

## O que mudou

| Antes (Supabase) | Agora |
|---|---|
| Auth (`supabase.auth.*`) | JWT proprio (`front/server/authCore.js`), cookies httpOnly |
| Postgres + RLS | MariaDB (`backend/sql/001_schema.sql`), autorizacao no servidor |
| Storage (buckets) | Disco local fora do docroot, servido por `/api/files/:id` autenticado |
| Realtime (feed) | Polling a cada 20s (`front/src/pages/Feed.tsx`) |

## 1. Criar o banco no cPanel

cPanel > **Bancos de Dados MySQL®** > criar banco + usuario (o cPanel prefixa
ambos com o seu usuario, ex.: `grpia_ddmlab` / `grpia_ddmlab_app`). Dar todos
os privilegios ao usuario sobre o banco.

Aplicar o schema:

```bash
mysql -u grpia_ddmlab_app -p grpia_ddmlab < sql/001_schema.sql
```

## 2. Configurar `.env.local`

Copiar `.env.example` para `.env.local` (mesma pasta, `backend/`) e preencher:

```bash
cp .env.example .env.local
chmod 600 .env.local
```

Gerar o segredo de JWT:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Campos obrigatorios pro app subir: `DB_HOST`, `DB_USER`, `DB_PASSWORD`,
`DB_NAME`, `JWT_ACCESS_SECRET`. Sem eles o `server.js` sai com `process.exit(1)`
de proposito (fail-fast) — ver `front/server.js`.

## 3. Migrar os dados do Supabase

Precisa do banco MariaDB ja com o schema aplicado (passo 1).

```bash
cd scripts
npm install
```

Preencher em `backend/.env.local` (nao em `scripts/`, o script le o mesmo arquivo):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Project Settings > API. A
  service_role key ignora RLS; nunca deixe ela em codigo do frontend.
- `SUPABASE_DB_URL` — Project Settings > Database > Connection string > URI.
  **Sem essa variavel, os hashes de senha nao migram** e todo mundo precisa
  usar "Esqueci minha senha" no primeiro acesso. Com ela, o script le
  `auth.users` direto via Postgres e preserva o bcrypt original — ninguem
  troca de senha.

Rodar primeiro em modo seco pra conferir os numeros antes de gravar:

```bash
node migrate.mjs --dry-run
```

Se os totais baterem com o que voce espera (usuarios, posts, informativos
etc.), rodar de verdade:

```bash
node migrate.mjs
```

O script e idempotente — pode rodar de novo sem duplicar linhas (usa o `id`
original do Supabase). Etapas isoladas com `--only=`:
`users`, `storage`, `logs`, `conversas`, `feed`, `rh`, `prompts`, `misc`,
`creator-images` (ver a lista `STEPS` no topo de `migrate.mjs`).

**Atencao real:** o `.sql` que descrevia o schema do Supabase deste projeto
nao batia com o banco ao vivo (ver a nota de diagnostico de 2026-07). O
`migrate.mjs` le os nomes de coluna que o proprio app usava para gravar — e
a fonte mais confiavel disponivel, mas confira o `--dry-run` mesmo assim,
em especial as contagens de `logs_uso_ia` e `prompts` (colunas com nomes
alternativos historicos).

## 4. Depois da migracao

- Conferir alguns logins reais (ou pedir pra 2-3 pessoas testarem).
- Avisar quem apareceu na lista "SEM SENHA MIGRADA" no fim do `migrate.mjs`
  pra usar "Esqueci minha senha".
- So depois de confirmar que esta tudo certo, desativar/apagar o projeto
  Supabase (Settings > General > Pause/Delete project) — ele e compartilhado
  com outras ferramentas do grupo, entao NAO apague sem confirmar que nada
  mais usa aquele projeto especifico.

## Arquivos

- `sql/001_schema.sql` — schema completo do MariaDB
- `.env.example` — todas as variaveis, com comentario do que cada uma faz
- `scripts/migrate.mjs` — importa Supabase -> MariaDB (dados + arquivos)
- `../front/server/` — API (auth, rotas de dados, storage) que substitui o Supabase
