import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(SERVER_ROOT, 'data');
const DB_PATH = path.join(DATA_DIR, 'quickquote.db');

fs.mkdirSync(DATA_DIR, { recursive: true });
export const db = new sqlite3.Database(DB_PATH);

export const run = (sql: string, params: unknown[] = []) =>
  new Promise<void>((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

export const all = <T>(sql: string, params: unknown[] = []) =>
  new Promise<T[]>((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows as T[]);
    });
  });

export const get = <T>(sql: string, params: unknown[] = []) =>
  new Promise<T | undefined>((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row as T | undefined);
    });
  });

export async function initDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  await run(`CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rnc TEXT,
    email TEXT,
    phone TEXT,
    createdAt TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY,
    customerId TEXT NOT NULL,
    title TEXT NOT NULL,
    currency TEXT NOT NULL,
    createdBy TEXT NOT NULL DEFAULT 'human',
    items TEXT NOT NULL,
    subtotal REAL NOT NULL,
    tax REAL NOT NULL,
    total REAL NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (customerId) REFERENCES customers(id)
  )`);

  const quoteColumns = await all<{ name: string }>('PRAGMA table_info(quotes)');
  const hasCreatedBy = quoteColumns.some((column) => column.name === 'createdBy');
  if (!hasCreatedBy) {
    await run(`ALTER TABLE quotes ADD COLUMN createdBy TEXT NOT NULL DEFAULT 'human'`);
  }

  const existingCustomers = await get<{ count: number }>('SELECT COUNT(*) as count FROM customers');
  if (!existingCustomers || existingCustomers.count === 0) {
    const c1 = uuidv4();
    const c2 = uuidv4();
    const now = new Date().toISOString();
    await run(
      'INSERT INTO customers (id, name, rnc, email, phone, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [c1, 'Juan Pérez', '131-1234567-8', 'juan@correo.com', '8095551234', now]
    );
    await run(
      'INSERT INTO customers (id, name, rnc, email, phone, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [c2, 'María Rodríguez', '101-7654321-9', 'maria@correo.com', '8294449876', now]
    );

    const items = [{ description: 'Servicio de logística', qty: 2, unitPrice: 7500 }];
    const subtotal = 15000;
    const tax = subtotal * 0.18;
    const total = subtotal + tax;

    await run(
      `INSERT INTO quotes (id, customerId, title, currency, createdBy, items, subtotal, tax, total, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), c1, 'Cotización inicial logística', 'DOP', 'human', JSON.stringify(items), subtotal, tax, total, now]
    );
  }
}
