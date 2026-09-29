# Sleep On It

A little jar for impulsive urges, with wish lists friends can peek at.

- `public/` is the app.
- `netlify/functions/` are the helpers for notifications and friends.

Notifications need these environment variables in Netlify (make them at `/setup.html` on your site):

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (optional, e.g. `mailto:you@example.com`)

Friends and wishes need no extra setup.
