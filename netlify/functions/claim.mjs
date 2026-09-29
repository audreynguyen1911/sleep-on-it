// A friend marks a wish as "I'll get this" (or undoes it). The owner gets a notification but never learns who.
import { getStore } from '@netlify/blobs';
import { sha, bad, normCode } from '../lib/util.mjs';
import { pushTo } from '../lib/push.mjs';

export default async (req) => {
  if (req.method !== 'POST') return bad('Method not allowed', 405);
  let body; try { body = await req.json(); } catch { return bad('Bad JSON'); }
  const code = normCode(body.code), wishId = String(body.wishId || ''), token = String(body.token || '');
  if (!code || !wishId || token.length < 16 || token.length > 80) return bad('Missing details');

  const store = getStore('friends');
  const id = await store.get('c:' + code);
  const p = id && await store.get('p:' + id, { type: 'json' });
  if (!p) return bad('Not found', 404);
  const wish = (p.wishes || []).find(w => w.id === wishId);
  if (!wish) return bad('Not found', 404);
  p.claims = p.claims || {};
  const tokenHash = await sha(token);

  if (body.undo) {
    if (p.claims[wishId] && p.claims[wishId].tokenHash === tokenHash) {
      delete p.claims[wishId];
      await store.setJSON('p:' + id, p);
    }
    return Response.json({ ok: true });
  }
  if (p.claims[wishId]) return bad('Already claimed', 409);
  p.claims[wishId] = { at: Date.now(), tokenHash };
  await store.setJSON('p:' + id, p);
  await pushTo(p.subKey, { title: 'Someone got you something ✨', body: `An anonymous friend is getting you “${wish.text}”.` });
  return Response.json({ ok: true });
};
export const config = { path: '/api/claim' };
