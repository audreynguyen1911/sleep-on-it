// Saves your name, your wishes and your friend code. Only your phone (with its secret) can change them.
import { getStore } from '@netlify/blobs';
import { sha, bad, cleanWish } from '../lib/util.mjs';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newCode() {
  const a = new Uint8Array(5); crypto.getRandomValues(a);
  return 'JAR-' + [...a].map(b => ALPHABET[b % ALPHABET.length]).join('');
}

export default async (req) => {
  if (req.method !== 'POST') return bad('Method not allowed', 405);
  let body; try { body = await req.json(); } catch { return bad('Bad JSON'); }
  const id = String(body.id || ''), secret = String(body.secret || '');
  if (!/^[a-z0-9]{16,48}$/.test(id) || secret.length < 20 || secret.length > 80) return bad('Bad identity');

  const store = getStore('friends');
  const secretHash = await sha(secret);
  let p = await store.get('p:' + id, { type: 'json' });
  if (p) {
    if (p.secretHash !== secretHash) return bad('Not allowed', 403);
  } else {
    let code = '';
    for (let i = 0; i < 8; i++) { const c = newCode(); if (!(await store.get('c:' + c))) { code = c; break; } }
    if (!code) return bad('Try again', 503);
    await store.set('c:' + code, id);
    p = { id, secretHash, code, name: '', wishes: [], claims: {}, created: Date.now() };
  }

  if (typeof body.name === 'string') p.name = body.name.trim().slice(0, 30);
  if (Array.isArray(body.wishes)) {
    p.wishes = body.wishes.slice(0, 100).map(cleanWish).filter(Boolean);
    const ids = new Set(p.wishes.map(w => w.id));
    for (const k of Object.keys(p.claims || {})) if (!ids.has(k)) delete p.claims[k];
  }
  if (typeof body.endpoint === 'string') p.subKey = body.endpoint ? await sha(body.endpoint) : null;
  p.updated = Date.now();
  await store.setJSON('p:' + id, p);

  const claims = {};
  for (const [k, v] of Object.entries(p.claims || {})) claims[k] = { at: v.at };
  return Response.json({ code: p.code, name: p.name, claims });
};
export const config = { path: '/api/profile' };
