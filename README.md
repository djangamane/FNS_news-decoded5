<div align="center">
<img width="1200" height="475" alt="Fragile News Source Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🔮 Fragile News Source (FNS)

**AI-Powered Media Analysis Tool - Building Skynet to Prevent Skynet**

An ethical AI platform that decodes white supremacy in news media through advanced bias detection and counter-perspective analysis. Inspired by the Matrix and Terminator 2 ethos - using technology to prevent technological oppression.

## 🌟 Features

- **Real-time Bias Detection**: AI-powered analysis of racial bias in news articles
- **Counter-Perspective Generation**: "Keisha Translation" for alternative viewpoints
- **Article Extraction**: Advanced content parsing with Readability integration
- **Cyberpunk UI**: Matrix-inspired interface with digital rain effects
- **Admin Dashboard**: Backend operations for manual article processing

## 🚀 Deployment

### Vercel Deployment

1. **Connect Repository**: Link your GitHub repo `https://github.com/djangamane/FNS_news-decoded5` to Vercel
2. **Environment Variables**: Add the following in Vercel dashboard:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_BACKEND_URL=https://your-backend-host
   ```
   Do **not** set the Gemini key here. Vite inlines every `VITE_`-prefixed
   variable into the client bundle, where any visitor can read it. The key
   belongs to the backend only, as `GEMINI_API_KEY`.
3. **Build Settings**: Vercel will automatically detect the configuration from `vercel.json`
4. **Deploy**: Click deploy and your site will be live!

### Newsletter Ingest

The daily newsletter reaches this app from the `soWSnewsletter` repository. Its
GitHub Action posts each issue to `POST /api/blog/ingest`, which stores it as a
draft for review in the Admin dashboard. This replaced a Google Sheet written by
an external Make scenario, which stopped running on 2025-06-04 without alerting
anyone.

To set it up:

1. Apply `backend/migrations/001_newsletter_drafts.sql` to your database.
2. Set `BLOG_INGEST_API_KEY` in the backend environment to a long random string.
3. In `soWSnewsletter`, add repository secrets `FNS_INGEST_URL`
   (`https://your-backend-host/api/blog/ingest`) and `FNS_INGEST_KEY` (the same
   value as `BLOG_INGEST_API_KEY`).
4. Optionally set `BLOG_INGEST_ENHANCE=true` to rewrite each newsletter through
   Gemini on arrival. This costs two model calls per day and is off by default.

If the feed stops updating, the Admin dashboard shows a staleness warning rather
than quietly serving old entries.

### Backend Deployment

The backend API needs to be deployed separately. You can deploy it to:
- **Railway**: `railway up` in the backend directory
- **Render**: Connect the backend repo
- **Heroku**: `git push heroku main`

### Local Development

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Create `.env.local` with your API keys
3. Run development server: `npm run dev`
4. For backend: `cd backend && npm install && npm run dev`

The backend needs its own `.env` with `GEMINI_API_KEY`, `DATABASE_URL` and
`ADMIN_PASSWORD`. The frontend reaches it through `VITE_BACKEND_URL`.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create a `.env.local` file and add your public config (e.g., `VITE_SUPABASE_URL=your_supabase_url`, `VITE_SUPABASE_ANON_KEY=your_supabase_anon_key`, `VITE_BACKEND_URL=http://localhost:3002`). The Gemini key goes in `backend/.env` as `GEMINI_API_KEY`, never here.
3. Run the app:
   `npm run dev`
