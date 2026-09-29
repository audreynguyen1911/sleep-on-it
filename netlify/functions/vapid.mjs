// Gives the app the public key it needs to sign up for notifications.
export default async () => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return new Response('Notifications are not set up yet', { status: 503 });
  return Response.json({ key });
};
export const config = { path: '/api/vapid' };
