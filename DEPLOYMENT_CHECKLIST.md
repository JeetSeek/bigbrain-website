# Production Deployment Checklist

Use this checklist before deploying BoilerBrain to production.

## 📋 Pre-Deployment Tasks

### Environment Configuration

- [ ] **Backend Environment Variables**
  - [ ] Copy `server/.env.example` to `server/.env`
  - [ ] Set `SUPABASE_URL` with production URL
  - [ ] Set `SUPABASE_SERVICE_KEY` with production key
  - [ ] Set `OPENAI_API_KEY` (primary)
  - [ ] Set `OPENAI_API_KEY_2` (backup)
  - [ ] Set `OPENAI_API_KEY_3` (tertiary)
  - [ ] Set `ALLOWED_ORIGINS` with production domains
  - [ ] Set `ADMIN_EMAILS` with admin email addresses
  - [ ] Set `NODE_ENV=production`
  - [ ] Set `LOG_LEVEL=INFO` or `WARN`

- [ ] **Frontend Environment Variables**
  - [ ] Copy `.env.example` to `.env.production`
  - [ ] Set `VITE_SUPABASE_URL` with production URL
  - [ ] Set `VITE_SUPABASE_ANON_KEY` with anon key
  - [ ] Set `VITE_API_URL` with production API URL
  - [ ] Ensure `VITE_DEMO_MODE=false` (or remove)

### Security Configuration

- [ ] **Netlify Configuration**
  - [ ] Update `netlify.toml` line 12 with actual backend URL
  - [ ] Verify CSP allows your production domains
  - [ ] Test HTTPS redirect works

- [ ] **CORS Configuration**
  - [ ] Add all production domains to `ALLOWED_ORIGINS`
  - [ ] Include www and non-www versions
  - [ ] Include staging domains if needed

### Database Setup

- [ ] **Supabase Tables**
  - [ ] Verify `chat_sessions` table exists
  - [ ] Verify `boiler_fault_codes` table exists
  - [ ] Verify `diagnostic_fault_codes` table exists
  - [ ] Verify `enhanced_diagnostic_procedures` table exists
  - [ ] Verify `boiler_manuals` table exists (if using)
  - [ ] Set up Row Level Security (RLS) policies
  - [ ] Test database connections

- [ ] **Supabase Storage**
  - [ ] Verify `boiler-manuals` bucket exists
  - [ ] Set bucket to public (if manuals should be public)
  - [ ] Upload manual files to correct structure
  - [ ] Test storage access

### Code Quality

- [ ] Run `npm audit` in both root and server directories
- [ ] Fix any high/critical vulnerabilities
- [ ] Run linter: `npm run lint` (if configured)
- [ ] Run type checks (if using TypeScript)
- [ ] Remove all `console.log` statements from production code (Vite does this automatically)

### Testing

- [ ] **Manual Testing**
  - [ ] Test login flow
  - [ ] Test chat functionality
  - [ ] Test manual finder
  - [ ] Test all calculator tools
  - [ ] Test on mobile devices
  - [ ] Test on different browsers (Chrome, Firefox, Safari)
  - [ ] Test offline behavior

- [ ] **API Testing**
  - [ ] Test `/api/manuals` endpoint
  - [ ] Test `/api/chat` endpoint
  - [ ] Test `/api/agent/chat` endpoint
  - [ ] Test rate limiting
  - [ ] Test CORS with production domain

- [ ] **Performance Testing**
  - [ ] Run Lighthouse audit
  - [ ] Check bundle size
  - [ ] Test API response times
  - [ ] Test with slow network connection

### Monitoring & Logging

- [ ] Set up error tracking (Sentry recommended)
- [ ] Configure log aggregation
- [ ] Set up uptime monitoring
- [ ] Configure alerts for errors
- [ ] Set up analytics (Google Analytics, Plausible, etc.)

---

## 🚀 Deployment Steps

### Backend Deployment

#### Option 1: Render.com
```bash
# 1. Create new Web Service on Render
# 2. Connect GitHub repository
# 3. Set build command: cd server && npm install
# 4. Set start command: cd server && npm start
# 5. Add environment variables from server/.env
# 6. Deploy
```

#### Option 2: Railway.app
```bash
# 1. Install Railway CLI: npm install -g @railway/cli
# 2. Login: railway login
# 3. Initialize: railway init
# 4. Add environment variables: railway vars
# 5. Deploy: railway up
```

#### Option 3: Heroku
```bash
# 1. Create Procfile in server/:
echo "web: node index.js" > server/Procfile
# 2. Deploy:
cd server
git init
heroku create your-app-name
git add .
git commit -m "Initial commit"
git push heroku main
# 3. Set environment variables:
heroku config:set SUPABASE_URL=xxx
heroku config:set SUPABASE_SERVICE_KEY=xxx
# ... (set all other env vars)
```

### Frontend Deployment

#### Netlify (Recommended)
```bash
# 1. Build the app
npm run build

# 2. Deploy via Netlify CLI
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod

# OR use Netlify dashboard:
# - Connect GitHub repository
# - Set build command: npm run build
# - Set publish directory: dist
# - Add environment variables
# - Deploy
```

#### Vercel
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
vercel --prod

# 3. Set environment variables in Vercel dashboard
```

---

## ✅ Post-Deployment Verification

### Immediate Checks

- [ ] Visit production URL - site loads
- [ ] SSL certificate is valid (HTTPS working)
- [ ] No console errors in browser
- [ ] Login works
- [ ] Chat works
- [ ] API calls succeed
- [ ] Rate limiting is active

### Functional Tests

- [ ] **Authentication**
  - [ ] Can register new account
  - [ ] Can login
  - [ ] Can logout
  - [ ] Protected routes redirect to login

- [ ] **Chat System**
  - [ ] Can send messages
  - [ ] AI responds correctly
  - [ ] Session persists across page refresh
  - [ ] Manual links work
  - [ ] Fault code detection works

- [ ] **Manual Finder**
  - [ ] Search works
  - [ ] Manufacturer filter works
  - [ ] Can view/download manuals
  - [ ] Pagination works

- [ ] **Tools**
  - [ ] Gas rate calculator works
  - [ ] BTU calculator works
  - [ ] Results are accurate

### Security Verification

- [ ] Run security headers check: https://securityheaders.com
- [ ] Verify CSP is active (check browser console)
- [ ] Test CORS with allowed domain
- [ ] Test CORS with disallowed domain (should fail)
- [ ] Verify rate limiting (make 100+ requests)
- [ ] Check for exposed secrets (scan with truffleHog)

### Performance Verification

- [ ] Run Lighthouse audit (target: 90+ scores)
- [ ] Check Core Web Vitals
- [ ] Test page load time < 3 seconds
- [ ] Test API response time < 2 seconds
- [ ] Verify caching is working

---

## 📊 Monitoring Setup

### Error Tracking

```bash
# Install Sentry
npm install --save @sentry/react @sentry/tracing

# Add to src/main.jsx:
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 0.1,
  environment: import.meta.env.MODE
});
```

### Uptime Monitoring

Set up monitors on:
- UptimeRobot (free)
- Pingdom
- Better Uptime
- StatusCake

Monitor these endpoints:
- Frontend: `https://yourdomain.com`
- Backend: `https://api.yourdomain.com/api/health` (create health check endpoint)

---

## 🔄 Rollback Plan

If issues occur after deployment:

### Frontend Rollback (Netlify)
```bash
netlify rollback
```

### Backend Rollback
1. Revert to previous deploy in hosting platform dashboard
2. Or: git revert and redeploy

### Database Rollback
1. If schema changes were made, revert migration
2. Restore from backup if data issues

---

## 📝 Post-Launch Tasks

### Week 1
- [ ] Monitor error rates daily
- [ ] Check performance metrics
- [ ] Review user feedback
- [ ] Fix any critical bugs
- [ ] Update documentation

### Month 1
- [ ] Analyze usage patterns
- [ ] Optimize slow endpoints
- [ ] Add missing features based on feedback
- [ ] Review and update security policies
- [ ] Conduct security audit

---

## 🆘 Emergency Contacts

**Backend Issues:**
- Hosting Provider Support: [link]
- Database Provider (Supabase): [link]

**Frontend Issues:**
- Netlify Support: [link]

**Third-Party Services:**
- OpenAI Status: https://status.openai.com
- Supabase Status: https://status.supabase.com

---

## 📞 Support Information

**For Users:**
- Support Email: support@yourdomain.com
- Gas Emergency: 0800 111 999 (UK)

**For Developers:**
- GitHub Issues: [repository link]
- Documentation: [docs link]
- Slack/Discord: [invite link]

---

**Last Updated:** October 21, 2025
**Checklist Version:** 1.0
