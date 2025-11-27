# BoilerBrain Deployment Guide
## Supabase + Netlify Architecture

This guide covers deploying BoilerBrain using **Supabase Edge Functions** (serverless backend) and **Netlify** (frontend hosting).

---

## Architecture Overview

```
┌──────────────────┐
│     Netlify      │
│    (Frontend)    │
│   React + Vite   │
└────────┬─────────┘
         │ HTTPS
         ▼
┌─────────────────────────────────────┐
│              Supabase               │
│  ┌─────────────────────────────┐    │
│  │      Edge Functions         │    │
│  │  - /chat     (AI diagnose)  │    │
│  │  - /manuals  (PDF search)   │    │
│  │  - /manufacturers (list)    │    │
│  └─────────────┬───────────────┘    │
│                │                    │
│  ┌─────────────▼───────────────┐    │
│  │     PostgreSQL Database     │    │
│  │  - 753 fault codes          │    │
│  │  - 3,073 manuals            │    │
│  │  - Chat sessions            │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

---

## Step 1: Deploy Edge Functions to Supabase

### 1.1 Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# or npm
npm install -g supabase
```

### 1.2 Login to Supabase

```bash
supabase login
```

### 1.3 Link Your Project

```bash
cd /path/to/bigbrain_recovered
supabase link --project-ref hfyfidpbtoqnqhdywdzw
```

### 1.4 Set Edge Function Secrets

```bash
# Required for chat function (OpenAI API)
supabase secrets set OPENAI_API_KEY=sk-your-openai-key

# Supabase credentials (usually auto-set)
supabase secrets set SUPABASE_URL=https://hfyfidpbtoqnqhdywdzw.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 1.5 Deploy Functions

```bash
# Deploy all functions
supabase functions deploy chat
supabase functions deploy manuals
supabase functions deploy manufacturers

# Or deploy all at once
supabase functions deploy
```

### 1.6 Test Functions

```bash
# Test chat function
curl -X POST 'https://hfyfidpbtoqnqhdywdzw.supabase.co/functions/v1/chat' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"message": "ideal logic combi f22", "sessionId": "test-123", "history": []}'

# Test manuals function
curl 'https://hfyfidpbtoqnqhdywdzw.supabase.co/functions/v1/manuals?manufacturer=ideal&limit=5' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

---

## Step 2: Deploy Frontend to Netlify

### 2.1 Connect GitHub Repository

1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Select GitHub and choose `JeetSeek/bigbrain-website`
4. Netlify will auto-detect the build settings from `netlify.toml`

### 2.2 Set Environment Variables

In Netlify dashboard → Site settings → Environment variables:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://hfyfidpbtoqnqhdywdzw.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `VITE_DEPLOYMENT_MODE` | `supabase` |

### 2.3 Deploy

```bash
# Push to main branch triggers auto-deploy
git push origin main

# Or manual deploy
netlify deploy --prod
```

---

## Step 3: Verify Deployment

### Frontend URLs
- Production: `https://your-site.netlify.app`
- Preview deploys: Auto-generated for PRs

### API Endpoints (Supabase Edge Functions)
- Chat: `https://hfyfidpbtoqnqhdywdzw.supabase.co/functions/v1/chat`
- Manuals: `https://hfyfidpbtoqnqhdywdzw.supabase.co/functions/v1/manuals`
- Manufacturers: `https://hfyfidpbtoqnqhdywdzw.supabase.co/functions/v1/manufacturers`

---

## Environment Variables Reference

### Netlify (Frontend)
```
VITE_SUPABASE_URL=https://hfyfidpbtoqnqhdywdzw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key
VITE_DEPLOYMENT_MODE=supabase
```

### Supabase Edge Functions (Secrets)
```
OPENAI_API_KEY=sk-...your-openai-key
SUPABASE_URL=https://hfyfidpbtoqnqhdywdzw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-key
```

---

## Local Development

For local development, you can still use the Express backend:

```bash
# Terminal 1: Start backend
cd server && npm start

# Terminal 2: Start frontend (uses localhost:3204)
npm run dev
```

The frontend auto-detects local vs production mode:
- **Local**: Uses `http://localhost:3204` (Express)
- **Production**: Uses Supabase Edge Functions

---

## Costs

| Service | Free Tier | Paid |
|---------|-----------|------|
| **Netlify** | 100GB bandwidth, 300 build mins | $19/mo |
| **Supabase** | 500K Edge Function invocations | $25/mo |
| **OpenAI** | Pay-as-you-go | ~$0.002/chat |

Estimated monthly cost for moderate usage: **$5-15**

---

## Troubleshooting

### Edge Function Errors
```bash
# Check function logs
supabase functions logs chat --tail

# Redeploy after fixes
supabase functions deploy chat
```

### CORS Issues
Edge Functions include CORS headers. If issues persist, check:
- Correct `VITE_SUPABASE_URL` in Netlify
- Anon key is valid and not expired

### Chat Not Working
1. Verify `OPENAI_API_KEY` is set in Supabase secrets
2. Check function logs for errors
3. Test directly with curl

---

## File Structure

```
bigbrain_recovered/
├── supabase/
│   └── functions/
│       ├── chat/index.ts          # AI chat endpoint
│       ├── manuals/index.ts       # Manual search
│       └── manufacturers/index.ts # Manufacturer list
├── src/                           # React frontend
├── netlify.toml                   # Netlify config
└── DEPLOYMENT_GUIDE.md            # This file
```
