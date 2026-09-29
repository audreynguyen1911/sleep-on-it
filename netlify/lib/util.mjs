export async function sha(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s)));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export const bad = (msg, status = 400) => Response.json({ error: msg }, { status });
const CATS = new Set(['buy', 'eat', 'msg', 'big']);
export function cleanWish(w) {
  if (!w || typeof w !== 'object') return null;
  const id = String(w.id || '').slice(0, 40);
  const text = String(w.text || '').trim().slice(0, 80);
  if (!id || !text) return null;
  let link = String(w.link || '').trim().slice(0, 500);
  if (!/^https?:\/\//i.test(link)) link = '';
  return {
    id, text, link,
    cat: CATS.has(w.cat) ? w.cat : 'buy',
    color: /^#[0-9a-f]{6}$/i.test(w.color || '') ? w.color : '#F2B632'
  };
}
export function normCode(s) {
  let c = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (c.startsWith('JAR')) c = c.slice(3);
  return c ? 'JAR-' + c : '';
}
