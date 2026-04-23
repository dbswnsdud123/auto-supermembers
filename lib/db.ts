import { createClient, type Client } from '@libsql/client';
import * as fs from 'node:fs';
import * as path from 'node:path';

let _client: Client | null = null;
let _schemaReady: Promise<void> | null = null;

export function db(): Client {
  if (_client) return _client;
  const url = process.env.TURSO_DATABASE_URL || 'file:./data/local.db';
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url.startsWith('file:')) {
    let filePath = url.slice('file:'.length);
    if (filePath.startsWith('//')) filePath = filePath.slice(2);
    const dir = path.dirname(filePath);
    if (dir && dir !== '.' && dir !== '/') {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  _client = createClient({ url, authToken });
  return _client;
}

export function ensureSchema(): Promise<void> {
  if (_schemaReady) return _schemaReady;
  _schemaReady = (async () => {
    await db().execute(`
      CREATE TABLE IF NOT EXISTS style_sources (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL UNIQUE,
        title TEXT,
        content TEXT NOT NULL,
        profile_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
  })();
  return _schemaReady;
}

export type StyleSourceRow = {
  id: string;
  url: string;
  title: string | null;
  content: string;
  profile_json: string;
  created_at: number;
};

export async function listSources(): Promise<StyleSourceRow[]> {
  await ensureSchema();
  const res = await db().execute('SELECT * FROM style_sources ORDER BY created_at DESC');
  return res.rows.map((r) => ({
    id: String(r.id),
    url: String(r.url),
    title: r.title == null ? null : String(r.title),
    content: String(r.content),
    profile_json: String(r.profile_json),
    created_at: Number(r.created_at),
  }));
}

export async function addSource(row: Omit<StyleSourceRow, 'created_at'>): Promise<void> {
  await ensureSchema();
  await db().execute({
    sql: `INSERT INTO style_sources (id, url, title, content, profile_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [row.id, row.url, row.title, row.content, row.profile_json, Date.now()],
  });
}

export async function deleteSource(id: string): Promise<void> {
  await ensureSchema();
  await db().execute({
    sql: 'DELETE FROM style_sources WHERE id = ?',
    args: [id],
  });
}

export async function findSourceByUrl(url: string): Promise<StyleSourceRow | null> {
  await ensureSchema();
  const res = await db().execute({
    sql: 'SELECT * FROM style_sources WHERE url = ? LIMIT 1',
    args: [url],
  });
  const r = res.rows[0];
  if (!r) return null;
  return {
    id: String(r.id),
    url: String(r.url),
    title: r.title == null ? null : String(r.title),
    content: String(r.content),
    profile_json: String(r.profile_json),
    created_at: Number(r.created_at),
  };
}
