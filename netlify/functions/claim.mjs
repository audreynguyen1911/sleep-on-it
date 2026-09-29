// A friend marks a wish as "I'll get this" (or undoes it). The owner gets a notification but never learns who.
import { sha, bad, normCode, friendsStore, getClaims } from '../lib/util.mjs';
import { pushTo } from '../lib/push.mjs';

export default async (req) => {
  if (req.method !== 'POST') return bad('Method not allowed', 405);
  let body; try { body = await req.json(); } catch { return bad('Bad JSON'); }
  const code = normCode(body.code), wishId = String(body.wishId || ''), token = String(body.token || '');
  if (!code || !wishId || token.length < 16 || token.length > 80) return bad('Missing details');

  const store = friendsStore();
  const id = await store.get('c:' + code);
  const p = id && await store.get('p:' + id, { type: 'json' });
  if (!p) return bad('Not found', 404);
  const wish = (p.wishes || []).find(w => w.id === wishId);
  if (!wish) return bad('Not found', 404);

  const claims = await getClaims(store, id, p);
  const tokenHash = await sha(token);
  if (body.undo) {
    if (claims[wishId] && claims[wishId].tokenHash === tokenHash) {
      delete claims[wishId];
      await store.setJSON('cl:' + id, claims);
    }
    return Response.json({ ok: true });
  }
  if (claims[wishId]) return bad('Already claimed', 409);
  claims[wishId] = { at: Date.now(), tokenHash };
  await store.setJSON('cl:' + id, claims);
  await pushTo(p.subKey, { title: 'Someone got you something ✨', body: `An anonymous friend is getting you “${wish.text}”.`, refresh: true });
  return Response.json({ ok: true });
};
export const config = { path: '/api/claim' };
