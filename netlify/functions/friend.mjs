// Lets a friend peek at someone's wishes using their friend code. Never shows who claimed what.
import { bad, normCode, friendsStore, getClaims } from '../lib/util.mjs';

export default async (req) => {
  const code = normCode(new URL(req.url).searchParams.get('code'));
  if (!code) return bad('Missing code');
  const store = friendsStore();
  const id = await store.get('c:' + code);
  if (!id) return bad('Not found', 404);
  const p = await store.get('p:' + id, { type: 'json' });
  if (!p) return bad('Not found', 404);
  const claims = await getClaims(store, id, p);
  return Response.json({
    code, name: p.name || '',
    wishes: (p.wishes || []).map(w => ({ id: w.id, text: w.text, link: w.link, cat: w.cat, color: w.color, claimed: !!claims[w.id] }))
  }, { headers: { 'Cache-Control': 'no-store' } });
};
export const config = { path: '/api/friend' };
