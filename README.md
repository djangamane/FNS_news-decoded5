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
   VITE_GEMINI_API_KEY=your_gemini_api_key
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ADMIN_PASSWORD=your_admin_password
   ```
3. **Build Settings**: Vercel will automatically detect the configuration from `vercel.json`
4. **Deploy**: Click deploy and your site will be live!

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

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create a `.env.local` file and add your API keys (e.g., `VITE_GEMINI_API_KEY=your_gemini_key`, `VITE_SUPABASE_URL=your_supabase_url`, `VITE_SUPABASE_ANON_KEY=your_supabase_anon_key`).
3. Run the app:
   `npm run dev`
