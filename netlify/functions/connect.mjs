// Adding a friend's code connects you both: you see their wishes, and you show up in their Friends list too.
import { sha, bad, normCode, friendsStore, getClaims, getFans } from '../lib/util.mjs';
import { pushTo } from '../lib/push.mjs';

export default async (req) => {
  if (req.method !== 'POST') return bad('Method not allowed', 405);
  let body; try { body = await req.json(); } catch { return bad('Bad JSON'); }
  const id = String(body.id || ''), secret = String(body.secret || ''), code = normCode(body.code);
  if (!/^[a-z0-9]{16,48}$/.test(id) || !secret || !code) return bad('Missing details');

  const store = friendsStore();
  const me = await store.get('p:' + id, { type: 'json' });
  if (!me || me.secretHash !== await sha(secret)) return bad('Not allowed', 403);
  const theirId = await store.get('c:' + code);
  const them = theirId && await store.get('p:' + theirId, { type: 'json' });
  if (!them) return bad('Not found', 404);
  if (them.id === me.id) return bad("That's your own code", 400);

  const fans = await getFans(store, them.id, them);
  const isNew = !fans.some(f => f.code === me.code);
  if (isNew) {
    fans.push({ code: me.code, at: Date.now() });
    await store.setJSON('f:' + them.id, fans.slice(-500));
    if (!body.quiet) await pushTo(them.subKey, { title: 'New friend on Sleep On It 💛', body: `${me.name || 'Someone'} added you as a friend. Peek at each other's wishes!`, refresh: true });
  }
  const claims = await getClaims(store, them.id, them);
  return Response.json({
    code, name: them.name || '',
    wishes: (them.wishes || []).map(w => ({ id: w.id, text: w.text, link: w.link, cat: w.cat, color: w.color, claimed: !!claims[w.id] }))
  });
};
export const config = { path: '/api/connect' };
