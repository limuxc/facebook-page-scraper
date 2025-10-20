# Facebook Page Scraper — Usage Wiki

This wiki explains how to use the Facebook Page Scraper app, with examples for both the web UI and direct API calls. It also documents the webhook payloads, sample receiver code, troubleshooting tips, and security notes.

## Table of contents
- Quick start
- Web UI
- API examples (curl)
- Webhook payload formats
- Sample webhook receiver (Node/Express)
- Troubleshooting
- Security notes

---

## Quick start
1. Install dependencies
```bash
cd /home/sa/Desktop/scrap
npm install
```
2. Run the server
```bash
npm run dev
```
3. Open the web UI
- Visit http://localhost:3000

---

## Web UI
- Enter `Facebook Access Token` and `Facebook Page ID`.
- Optional: provide a `Webhook URL` to override `.env` for that request.
- Toggle `Send each post individually` to control bulk vs individual sends.
- Submit and monitor the result message.

---

## API examples (curl)

Bulk send (single POST to webhook):
```bash
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{"accessToken":"<TOKEN>","pageId":"<PAGE_ID>","webhookUrl":"https://your-webhook.example/endpoint","sendIndividually":false}'
```

Individual sends (one POST per post):
```bash
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{"accessToken":"<TOKEN>","pageId":"<PAGE_ID>","webhookUrl":"https://your-webhook.example/endpoint","sendIndividually":true}'
```

---

## Webhook payload formats

Bulk mode (single POST):
```json
{
  "message": ["caption1", "caption2", ...],
  "media_url": ["https://...", null, ...],
  "post_id": ["123_456", "789_012", ...],
  "post_url": ["https://www.facebook.com/...", ...]
}
```

Individual mode (one POST per post):
```json
{
  "message": "caption text",
  "post_id": "123_456",
  "media_url": "https://...",
  "post_url": "https://www.facebook.com/..."
}
```

---

## Sample webhook receiver (Node/Express)

Create a small Express app to receive webhook payloads:

```js
const express = require('express');
const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  console.log('Received webhook:', req.body);
  // Handle bulk or individual payloads
  if (req.body.items) {
    // older format: items array
    req.body.items.forEach(item => console.log(item));
  } else if (req.body.message && Array.isArray(req.body.message)) {
    // bulk new format
    for (let i = 0; i < req.body.message.length; i++) {
      console.log({
        message: req.body.message[i],
        media_url: req.body.media_url[i],
        post_id: req.body.post_id[i],
        post_url: req.body.post_url ? req.body.post_url[i] : undefined
      });
    }
  } else {
    // individual
    console.log(req.body);
  }

  res.status(200).send('ok');
});

app.listen(3001, () => console.log('Webhook receiver listening on 3001'));
```

---

## Troubleshooting
- If you get 404 from the webhook, ensure the URL path is correct and that your server is reachable from the machine running the scraper.
- If Facebook returns OAuth errors, verify token permissions and expiration.
- Empty arrays: confirm Page ID and access token have permission to read posts.

---

## Security notes
- Do not store long-lived tokens in plaintext in a public repo.
- Prefer using page access tokens with the minimum required scopes.
- If you need to authenticate webhook requests, add an `Authorization` header support in the scraper and validate it in the receiver.

---

If you want, I can add a GitHub Wiki page (if this repo has wiki enabled) or open a PR with the `WIKI.md`. Do you want me to push this file to GitHub now?