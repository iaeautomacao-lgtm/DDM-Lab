import mysql from "mysql2/promise";

// Pool unico do processo. cPanel/MariaDB tipicamente aceita poucas conexoes
// simultaneas por banco — mantenha connectionLimit baixo.
const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE || 8),
  queueLimit: 0,
  dateStrings: false,
  decimalNumbers: true,
});

export const db = {
  /** SELECT que retorna varias linhas. */
  query: async (sql, params = []) => {
    const [rows] = await pool.query(sql, params);
    return rows;
  },
  /** SELECT que retorna uma linha ou null. */
  queryOne: async (sql, params = []) => {
    const [rows] = await pool.query(sql, params);
    return rows[0] ?? null;
  },
  /** INSERT/UPDATE/DELETE. Retorna o resultado (insertId, affectedRows). */
  exec: async (sql, params = []) => {
    const [result] = await pool.query(sql, params);
    return result;
  },
  /** Transacao: callback recebe uma conexao com query/queryOne/exec. */
  transaction: async (callback) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const scoped = {
        query: async (sql, params = []) => (await conn.query(sql, params))[0],
        queryOne: async (sql, params = []) => (await conn.query(sql, params))[0][0] ?? null,
        exec: async (sql, params = []) => (await conn.query(sql, params))[0],
      };
      const result = await callback(scoped);
      await conn.commit();
      return result;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },
  ping: async () => {
    await pool.query("SELECT 1");
  },
};
