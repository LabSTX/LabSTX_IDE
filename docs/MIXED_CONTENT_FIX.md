# Mixed Content Error - Quick Fix

## Problem
Vercel (HTTPS) cannot call GCP compiler (HTTP) due to browser mixed content restrictions.

## Solution
Use `/api/compile` Vercel proxy to forward requests server-side.

## What Changed

- ✅ **Created** `api/compile.js` - Serverless function that proxies to GCP
- ✅ **Updated** `services/casper/compiler.ts` - Uses proxy in production, direct in dev

## How It Works

### Production (Vercel):
```
Browser (HTTPS) → /api/compile (HTTPS) → GCP Server (HTTP) → WASM
```

### Development:
```
Browser (HTTP) → GCP Server directly (HTTP) → WASM
```

## What You Need to Do

**Redeploy to Vercel** - The changes will automatically fix the mixed content error!

```bash
git add .
git commit -m "Fix mixed content error with compilation proxy"
git push
```

Vercel will auto-deploy and the error will be gone! ✅
