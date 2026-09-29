// The app sends its notification address and what's asleep in the jar, so the server knows when to ping.
import { pushStore } from '../lib/util.mjs';

async function keyFor(endpoint) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  let body;
  try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400 }); }
  const sub = body && body.subscription;
  if (!sub || typeof sub.endpoint !== 'string' || !sub.keys) return new Response('Missing subscription', { status: 400 });

  const store = pushStore();
  const key = await keyFor(sub.endpoint);
  if (body.remove) { await store.delete(key); return Response.json({ ok: true }); }

  const wakes = (Array.isArray(body.wakes) ? body.wakes : []).slice(0, 200).map(w => ({
    id: String(w.id).slice(0, 40), text: String(w.text || '').slice(0, 80), due: Number(w.due) || 0
  }));
  const prev = (await store.get(key, { type: 'json' })) || {};
  const live = new Set(wakes.map(w => `${w.id}:${w.due}`));
  const sent = (prev.sent || []).filter(s => live.has(s));
  await store.setJSON(key, { subscription: sub, wakes, sent, updated: Date.now() });
  return Response.json({ ok: true });
};
export const config = { path: '/api/sync' };
