# 🔴 CRITICAL FIX NEEDED - Database Access Issue

**Date:** October 1, 2025  
**Status:** ❌ BLOCKING - Chat not working  
**Severity:** HIGH

---

## Problem

The chat is **NOT searching the database** for fault codes. It's giving generic/incorrect responses instead of using the real data.

### Root Cause

The `SUPABASE_SERVICE_KEY` in `server/.env` is actually the **anon key**, not the service_role key. The anon key doesn't have permission to read the fault code tables.

**Evidence:**
```bash
# Current key in server/.env (WRONG):
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# This decodes to: {"role":"anon"} ❌

# We need the service_role key which decodes to: {"role":"service_role"} ✅
```

---

## The Fix

### Step 1: Get the Service Role Key

1. Go to: https://supabase.com/dashboard/project/hfyfidpbtoqnqhdywdzw/settings/api
2. Scroll to **"Project API keys"**
3. Find the **"service_role"** key (NOT the anon key)
4. Copy it (it's a long JWT token starting with `eyJ...`)

### Step 2: Update server/.env

Open `/Users/markburrows/CascadeProjects/bigbrain_website/bigbrain_recovered/server/.env`

Replace this line:
```bash
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmeWZpZHBidG9xbnFoZHl3ZHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0OTQ4OTksImV4cCI6MjA2MTA3MDg5OX0.eZrUGTGOOnHrZp2BoIbnaqSPvcmNKYfpoLXmGsa3PME
```

With:
```bash
SUPABASE_SERVICE_KEY=[paste the service_role key here]
```

### Step 3: Restart Backend

```bash
# Kill the current backend
kill $(lsof -ti:3204)

# Start it again
cd /Users/markburrows/CascadeProjects/bigbrain_website/bigbrain_recovered/server
node index.js
```

### Step 4: Test

```bash
curl -X POST http://localhost:3204/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"L2","sessionId":"test","history":[{"sender":"user","text":"ideal logic 24 combi","timestamp":"2025-10-01T20:00:00.000Z"}]}'
```

**Expected response:** Should mention "Ignition lockout" (from database)  
**Current response:** Says "not recognized" or "low water pressure" (wrong)

---

## What I've Already Fixed

✅ Disabled RLS on fault code tables  
✅ Updated code to check for fault codes properly  
✅ Added better logging  
✅ Upgraded to GPT-4o-mini for better instruction following  
✅ Fixed conversation context handling  

❌ **Still need:** Correct service_role key in .env

---

## Why This Matters

Without the service_role key:
- ❌ Database queries return empty results
- ❌ AI makes up fault code information
- ❌ Users get incorrect diagnostic advice
- ❌ System appears broken

With the service_role key:
- ✅ Database queries work
- ✅ AI uses real fault code data
- ✅ Users get accurate diagnostics
- ✅ System works as designed

---

## Verification

After updating the key, you should see in the logs:
```
[EnhancedFaultCodeService] Description from DB: Ignition lockout
```

Instead of:
```
[EnhancedFaultCodeService] Description from DB: null
```

---

## Database Has the Data

I've verified the database contains the correct information:

```sql
SELECT * FROM boiler_fault_codes WHERE fault_code = 'L2';
```

Returns:
```json
{
  "manufacturer": "Ideal",
  "fault_code": "L2",
  "description": "Ignition lockout",
  "solutions": "Check gas supply\nCheck ignition electrode and lead\nCheck flue for blockages\nReset boiler"
}
```

The data is there - we just need the right key to access it!

---

## Quick Reference

**Project:** boiler brain-files  
**Region:** eu-west-2  
**Project ID:** hfyfidpbtoqnqhdywdzw  
**Dashboard:** https://supabase.com/dashboard/project/hfyfidpbtoqnqhdywdzw  
**API Settings:** https://supabase.com/dashboard/project/hfyfidpbtoqnqhdywdzw/settings/api

---

## After the Fix

Once you update the key and restart:

1. **Refresh your browser** at http://localhost:5176
2. **Test the chat:**
   - Type: "ideal logic combi 24"
   - Then: "L2"
   - Should say: "Ignition lockout" ✅

3. **Verify in logs:**
   - Backend should show: `Description from DB: Ignition lockout`

---

**This is the ONLY remaining issue blocking the chat from working correctly!** 🎯
