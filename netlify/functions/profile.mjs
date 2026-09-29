// Saves your name, your wishes and your friend code. Only your phone (with its secret) can change them.
import { sha, bad, cleanWish, friendsStore, getClaims, getFans } from '../lib/util.mjs';

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

  const store = friendsStore();
  const secretHash = await sha(secret);
  let p = await store.get('p:' + id, { type: 'json' });
  if (p) {
    if (p.secretHash !== secretHash) return bad('Not allowed', 403);
  } else {
    let code = '';
    for (let i = 0; i < 8; i++) { const c = newCode(); if (!(await store.get('c:' + c))) { code = c; break; } }
    if (!code) return bad('Try again', 503);
    await store.set('c:' + code, id);
    p = { id, secretHash, code, name: '', wishes: [], created: Date.now() };
  }

  // One-time move of gifts and fans saved by the older version into their own records.
  if (p.claims && Object.keys(p.claims).length) { await store.setJSON('cl:' + id, await getClaims(store, id, p)); }
  if (p.fans && p.fans.length) { await store.setJSON('f:' + id, await getFans(store, id, p)); }
  delete p.claims; delete p.fans;

  if (typeof body.name === 'string') p.name = body.name.trim().slice(0, 30);
  if (Array.isArray(body.wishes)) p.wishes = body.wishes.slice(0, 100).map(cleanWish).filter(Boolean);
  if (typeof body.endpoint === 'string') p.subKey = body.endpoint ? await sha(body.endpoint) : null;
  p.updated = Date.now();
  await store.setJSON('p:' + id, p);

  const allClaims = await getClaims(store, id, p);
  const ids = new Set(p.wishes.map(w => w.id));
  const claims = {};
  for (const [k, v] of Object.entries(allClaims)) if (ids.has(k)) claims[k] = { at: v.at };

  const fans = [];
  for (const f of (await getFans(store, id, p)).slice(-200)) {
    const fid = await store.get('c:' + f.code);
    const fp = fid && await store.get('p:' + fid, { type: 'json' });
    if (fp) fans.push({ code: f.code, name: fp.name || '' });
  }
  return Response.json({ code: p.code, name: p.name, claims, fans });
};
export const config = { path: '/api/profile' };
