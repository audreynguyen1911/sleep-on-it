// Runs every 2 minutes: finds anything that has just woken up and sends a notification.
import webpush from 'web-push';
import { pushStore } from '../lib/util.mjs';

export default async () => {
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) { console.log('Notification keys are missing, skipping.'); return; }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:sleep-on-it@example.com', pub, priv);

  const store = pushStore();
  const now = Date.now();
  const { blobs } = await store.list();

  for (const { key } of blobs) {
    const rec = await store.get(key, { type: 'json' });
    if (!rec || !rec.subscription) continue;
    const sent = new Set(rec.sent || []);
    const due = (rec.wakes || []).filter(w => w.due <= now && !sent.has(`${w.id}:${w.due}`));
    if (!due.length) continue;

    const payload = due.length === 1
      ? { title: 'Something woke up in your jar', body: `“${due[0].text}” has slept on it. Still want it?` }
      : { title: `${due.length} things woke up in your jar`,
          body: `${due.slice(0, 3).map(w => `“${w.text}”`).join(', ')}${due.length > 3 ? ' and more' : ''}. Still want them?` };

    try {
      await webpush.sendNotification(rec.subscription, JSON.stringify(payload), { TTL: 60 * 60 * 12 });
      due.forEach(w => sent.add(`${w.id}:${w.due}`));
      rec.sent = [...sent];
      await store.setJSON(key, rec);
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) await store.delete(key); // phone unsubscribed
      else console.log('Push failed', err.statusCode, err.body);
    }
  }
};
export const config = { schedule: '*/2 * * * *' };
