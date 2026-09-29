// Sends a notification to one phone, using the address saved when it turned notifications on.
import webpush from 'web-push';
import { pushStore } from './util.mjs';

export async function pushTo(subKey, payload) {
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!subKey || !pub || !priv) return;
  const store = pushStore();
  const rec = await store.get(subKey, { type: 'json' });
  if (!rec || !rec.subscription) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:sleep-on-it@example.com', pub, priv);
  try {
    await webpush.sendNotification(rec.subscription, JSON.stringify(payload), { TTL: 60 * 60 * 24 });
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) await store.delete(subKey);
    else console.log('Push failed', err.statusCode, err.body);
  }
}
