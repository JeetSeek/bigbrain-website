# BoilerBrain - Quick Start Guide

Get up and running in 5 minutes! ⚡

## 🚀 Development Setup

### 1. Install Dependencies
```bash
npm install
cd server && npm install && cd ..
```

### 2. Configure Environment
```bash
# Frontend
cp .env.example .env.local

# Backend
cp server/.env.example server/.env
```

### 3. Edit Environment Files

**`.env.local`** (Frontend):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DEV_API_URL=http://localhost:3204
VITE_DEMO_MODE=true
```

**`server/.env`** (Backend):
```env
PORT=3204
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
OPENAI_API_KEY=sk-your-key
ALLOWED_ORIGINS=http://localhost:5176
```

### 4. Start Services

**Terminal 1 - Backend:**
```bash
cd server
npm start
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### 5. Open Browser
```
http://localhost:5176
```

---

## ✅ Verify Everything Works

1. **Health Check:**
   ```bash
   curl http://localhost:3204/api/v1/health
   ```

2. **Test Manual Search:**
   - Open app
   - Click "Manuals" tab
   - Search for "Worcester"

3. **Test Chat:**
   - Click "Chat" tab
   - Type: "Worcester Greenstar F22 fault code"
   - Should get AI response

---

## �� Troubleshooting

### Backend won't start
```bash
# Check port is free
lsof -i :3204

# Kill process if needed
kill -9 <PID>
```

### Frontend shows "Cannot connect"
```bash
# Verify backend is running
curl http://localhost:3204/api/v1/health

# Check .env.local has correct URL
cat .env.local | grep VITE_DEV_API_URL
```

### Database errors
- Verify Supabase credentials in `server/.env`
- Check Supabase project is running
- Test connection manually

---

## 📚 Next Steps

- Read: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- Review: [AUDIT_FIXES_IMPLEMENTED.md](./AUDIT_FIXES_IMPLEMENTED.md)
- Deploy: Follow deployment guide

---

**Need Help?** Check the full documentation or logs in `server/logs/`
