# 🚀 GitHub Actions Auto-Deploy Setup

**Date**: November 3, 2025  
**Type**: Fully Automated CI/CD  
**Status**: Ready to configure

---

## 🎯 What This Does

**Push to GitHub → Automatic Deployment!**

Every time you push code to GitHub:
1. ✅ Backend automatically deploys to Railway
2. ✅ Frontend automatically builds with correct backend URL
3. ✅ Frontend automatically deploys to Netlify
4. ✅ CORS automatically configured
5. ✅ Zero manual steps!

---

## 📋 One-Time Setup (15 minutes)

### **Step 1: Create Railway Project**

1. Go to https://railway.app
2. Create new project
3. Click "Deploy from GitHub repo"
4. Select your repository
5. Choose `server` folder as root
6. Add environment variables:
   ```
   PORT=3204
   NODE_ENV=production
   SUPABASE_URL=your_url
   SUPABASE_SERVICE_KEY=your_key
   OPENAI_API_KEY=your_key
   ALLOWED_ORIGINS=*
   ```
7. Deploy
8. Generate domain (Settings → Networking → Generate Domain)
9. Copy your Railway URL

### **Step 2: Get Railway Token**

1. Go to https://railway.app/account/tokens
2. Click "Create Token"
3. Name it: "GitHub Actions"
4. Copy the token
5. **Save it** - you'll need it for GitHub secrets

### **Step 3: Get Railway Project ID**

```bash
# In your server folder:
cd server
railway link
# This will show your project ID
```

Or get it from Railway dashboard URL:
`https://railway.app/project/[PROJECT_ID]`

### **Step 4: Create Netlify Site**

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Choose GitHub
4. Select your repository
5. Build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Click "Deploy site"
7. Copy your site ID from URL: `https://app.netlify.com/sites/[SITE_ID]`

### **Step 5: Get Netlify Token**

1. Go to https://app.netlify.com/user/applications
2. Click "New access token"
3. Name it: "GitHub Actions"
4. Copy the token

### **Step 6: Add GitHub Secrets**

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add these secrets:

```
RAILWAY_TOKEN
Value: [Your Railway token from Step 2]

RAILWAY_PROJECT_ID
Value: [Your Railway project ID from Step 3]

NETLIFY_AUTH_TOKEN
Value: [Your Netlify token from Step 5]

NETLIFY_SITE_ID
Value: [Your Netlify site ID from Step 4]

NETLIFY_SITE_URL
Value: https://your-site.netlify.app

BACKEND_URL
Value: your-app.up.railway.app (without https://)
```

---

## 🔧 GitHub Workflow Files

I've created two workflow options:

### **Option 1: deploy.yml** (Full Control)
- Deploys backend to Railway
- Gets backend URL automatically
- Updates frontend code
- Builds frontend
- Deploys to Netlify
- Updates CORS

### **Option 2: deploy-simple.yml** (Simpler)
- Uses pre-configured environment variables
- Faster deployment
- Less complex

**Choose one** and delete the other, or keep both and use different branches.

---

## 🚀 How to Use

### **After Setup**:

1. **Make changes** to your code
2. **Commit** changes:
   ```bash
   git add .
   git commit -m "Update feature"
   ```
3. **Push** to GitHub:
   ```bash
   git push origin main
   ```
4. **Watch** GitHub Actions deploy automatically!
5. **Done!** Your site is live in 3-5 minutes

---

## 📊 Monitoring Deployments

### **GitHub Actions**:
1. Go to your repository
2. Click "Actions" tab
3. See deployment progress
4. View logs if something fails

### **Railway**:
1. Go to https://railway.app
2. Select your project
3. See deployment logs
4. Monitor backend status

### **Netlify**:
1. Go to https://app.netlify.com
2. Select your site
3. See deployment logs
4. View build status

---

## 🔄 Deployment Flow

```
You push to GitHub
       ↓
GitHub Actions triggered
       ↓
Deploy Backend (Railway)
  - Install dependencies
  - Deploy server
  - Get backend URL
       ↓
Build Frontend
  - Update API URLs with backend URL
  - Run npm build
  - Create production bundle
       ↓
Deploy Frontend (Netlify)
  - Upload build to Netlify
  - Deploy to production
       ↓
Update CORS
  - Configure backend to allow frontend
       ↓
✅ Deployment Complete!
```

---

## ⚙️ Environment Variables

### **Backend (Railway)**:
Set in Railway dashboard:
```
PORT=3204
NODE_ENV=production
SUPABASE_URL=your_url
SUPABASE_SERVICE_KEY=your_key
OPENAI_API_KEY=your_key
OPENAI_API_KEY_2=backup_key
OPENAI_API_KEY_3=backup_key_2
ALLOWED_ORIGINS=https://your-site.netlify.app
```

### **Frontend (Build Time)**:
Set in GitHub secrets (used during build):
```
VITE_API_BASE_URL=https://your-backend.railway.app
```

---

## 🎯 Branch Strategy

### **Option 1: Single Branch**
- Push to `main` → Auto-deploy to production
- Simple, straightforward

### **Option 2: Multiple Branches**
- `main` → Production deployment
- `develop` → Staging deployment
- `feature/*` → No deployment

Update workflow to match your strategy:
```yaml
on:
  push:
    branches:
      - main        # Production
      - develop     # Staging
```

---

## 🚨 Troubleshooting

### **Deployment Fails**:
1. Check GitHub Actions logs
2. Verify all secrets are set correctly
3. Check Railway/Netlify status pages
4. Verify environment variables

### **Backend Not Accessible**:
1. Check Railway logs
2. Verify environment variables
3. Check Railway domain is generated
4. Test endpoint directly

### **Frontend Can't Connect**:
1. Check API URL in build logs
2. Verify CORS settings
3. Check browser console for errors
4. Test backend endpoint directly

### **CORS Errors**:
1. Check `ALLOWED_ORIGINS` in Railway
2. Make sure it includes your Netlify URL
3. Redeploy backend if needed

---

## 📝 Manual Deployment

If you need to deploy manually:

### **Backend**:
```bash
cd server
railway up
```

### **Frontend**:
```bash
npm run build
netlify deploy --prod --dir=dist
```

---

## 🔐 Security Best Practices

### **Secrets**:
- ✅ Never commit secrets to Git
- ✅ Use GitHub Secrets for sensitive data
- ✅ Rotate tokens periodically
- ✅ Use different tokens for different environments

### **Environment Variables**:
- ✅ Set in Railway/Netlify dashboards
- ✅ Never hardcode in code
- ✅ Use `.env.example` for documentation
- ✅ Add `.env` to `.gitignore`

---

## 📊 Deployment Times

**Typical deployment:**
- Backend: 2-3 minutes
- Frontend build: 30-60 seconds
- Frontend deploy: 30-60 seconds
- **Total: 3-5 minutes**

---

## ✅ Setup Checklist

- [ ] Railway project created
- [ ] Railway token obtained
- [ ] Railway project ID obtained
- [ ] Railway environment variables set
- [ ] Railway domain generated
- [ ] Netlify site created
- [ ] Netlify token obtained
- [ ] Netlify site ID obtained
- [ ] GitHub secrets added (all 6)
- [ ] Workflow file committed to repo
- [ ] Test deployment by pushing to GitHub
- [ ] Verify backend is accessible
- [ ] Verify frontend is accessible
- [ ] Test all features work

---

## 🎉 Benefits

### **Automated Deployment**:
- ✅ No manual steps
- ✅ Consistent deployments
- ✅ No human error
- ✅ Fast deployment

### **Version Control**:
- ✅ Every deployment tracked in Git
- ✅ Easy rollback
- ✅ Deployment history
- ✅ Code review before deploy

### **Collaboration**:
- ✅ Team can deploy easily
- ✅ No special access needed
- ✅ Transparent process
- ✅ Automated testing (can add)

---

## 🔄 Next Steps

### **After First Deployment**:
1. Test all features
2. Run database migrations
3. Add custom domain
4. Set up monitoring
5. Configure alerts

### **Optional Enhancements**:
1. Add automated tests
2. Add staging environment
3. Add preview deployments for PRs
4. Add Slack notifications
5. Add performance monitoring

---

## 📖 Additional Resources

**GitHub Actions**:
- https://docs.github.com/en/actions

**Railway**:
- https://docs.railway.app
- https://docs.railway.app/deploy/deployments

**Netlify**:
- https://docs.netlify.com
- https://docs.netlify.com/configure-builds/get-started/

---

## 🎯 Quick Start Commands

### **Initial Setup**:
```bash
# 1. Commit workflow files
git add .github/workflows/
git commit -m "Add GitHub Actions deployment"

# 2. Push to GitHub
git push origin main

# 3. Watch deployment in GitHub Actions tab
```

### **Future Deployments**:
```bash
# Make changes
git add .
git commit -m "Your changes"
git push origin main

# That's it! Auto-deploys in 3-5 minutes
```

---

## ✅ You're Ready!

**Setup the secrets in GitHub, push your code, and watch it deploy automatically!**

**No more manual deployments!** 🚀

Every push to `main` = Automatic deployment to production!
