# Facebook Page Scraper

A small Node.js app that fetches posts from a Facebook Page (via the Graph API) and forwards simplified post data to a webhook.

This project provides:
- A simple web UI where a user can enter a Facebook Access Token, Page ID and a Webhook URL.
- An option to send the scraped posts either as a single bulk payload or as individual webhook POSTs (one HTTP request per post).
- Simplified payloads that include only: post caption/message, media URL (first media item), post id and post URL.

---
# Facebook Page Scraper

A small Node.js app that fetches posts from a Facebook Page (via the Graph API) and forwards simplified post data to a webhook.

This project provides:
- A simple web UI where a user can enter a Facebook Access Token, Page ID and a Webhook URL.
- An option to send the scraped posts either as a single bulk payload or as individual webhook POSTs (one HTTP request per post).
- Simplified payloads that include only: post caption/message, media URL (first media item), post id and post URL.

---

## Quick start

1. Install dependencies

```bash
cd crap
npm install
```

2. Start the server

```bash
npm run dev
# or
npm start
```

3. Open the web UI

Open http://localhost:3000 in a browser.

4. Fill the form
- Facebook Access Token: A Page access token or user token with permissions to read the page's posts.
- Facebook Page ID: the numeric or vanity ID of the Page you want to scrape.
- Webhook URL: (optional) the URL to which the app will POST the scraped data. If left blank, the app uses `WEBHOOK_URL` from `.env` if set.
- "Send each post individually": check to POST one request per post; uncheck to POST a single bulk payload.

---

## API: POST /scrape
The web UI calls `/scrape` with a JSON body. You can also call this endpoint directly.

Request body (JSON):
```
{
  "accessToken": "<FB_ACCESS_TOKEN>",
  "pageId": "<PAGE_ID>",
  "webhookUrl": "https://your-webhook.example/endpoint", // optional
  "sendIndividually": true|false // optional, default false
}
```

Response (successful):
- If `sendIndividually: false` (bulk):
```
{ "success": true, "totalPosts": 23, "message": "Successfully scraped and sent 23 posts to webhook" }
```

- If `sendIndividually: true`:
```
{
  "success": true,
  "totalPosts": 23,
  "sent": 23,
  "failed": 0,
  "failures": []
}
```
If some individual sends failed, `failures` will include objects like `{ index, id, error }`.

---

## Webhook payloads

This app deliberately sends small, consistent fields so your webhook can process them easily.

Bulk mode (single POST): the webhook receives a JSON object with three arrays of equal length:
```
{
  "message": ["caption1", "caption2", ...],
  "media_url": ["https://...", null, ...],
  "post_id": ["123_456", "789_012", ...],
  "post_url": ["https://www.facebook.com/...", ...] // present if detectable
}
```

Individual mode (one POST per post): each POST has exactly these fields:
```
{
  "message": "caption text",
  "post_id": "123_456",
  "media_url": "https://...",
  "post_url": "https://www.facebook.com/..."
}
```

Notes:
- `media_url` will be `null` when a post has no media attachments or when an attachment URL can't be determined.
- `post_url` is best-effort and is constructed from the post id and the provided page id. For guaranteed permalink URLs, we can request `permalink_url` from the Graph API and include it in the payload.

---

## Permissions & Tokens
- The app uses the Graph API endpoint `/PAGE_ID/posts`. You need a token that can read public page posts or a Page access token with the appropriate permissions (for example `pages_read_engagement` / `pages_read_user_content` depending on your app setup and API version).
- If you encounter `OAuthException` or permission errors, verify the token's scopes and whether it is a Page token (recommended) vs. a user token.

---

## Configuration
- `.env` (optional)
```
WEBHOOK_URL=https://your-default-webhook.example/endpoint
```
- Values entered via the web UI override `.env` for that request.

---

## Troubleshooting
- 404 from webhook: confirm the webhook URL path is correct and that your webhook accepts POST JSON payloads.
- Authentication errors from Facebook: check your access token and required permissions.
- Empty results: check that the Page ID is correct and the token has access to view the page's posts.
- Server logs: see the terminal running `npm run dev` — the app logs fetch progress and webhook POST outcomes.

---

## Next steps / improvements
- Add retries + exponential backoff on webhook failures.
- Add optional headers (Authorization) for webhooks that require signed requests.
- Include `permalink_url` from the Graph API for canonical post links.
- Persist scrape history to disk or a database.

---

If you want any of the next-step features, tell me which one and I will add it.
