# ✅ Vercel Deployment Ready!

Your CasperIDE is now configured for Vercel deployment with automatic environment detection.

## What Was Changed

### 1. Added Vercel API Route
- **File**: `api/rpc.js`
- **Purpose**: Serverless function that proxies RPC requests to Casper testnet
- **Replaces**: The standalone `proxy-server.cjs` when deployed to Vercel

### 2. Created Vercel Configuration
- **File**: `vercel.json`
- **Contains**: Build settings, API route configuration, and CORS headers

### 3. Updated Frontend Code
- **File**: `services/casper/deployment.ts`
- **Change**: Auto-detects RPC endpoint based on environment
  - **Production (Vercel)**: Uses `/api/rpc`
  - **Development (Local)**: Uses `http://localhost:3001/rpc`

### 4. Created Deployment Guide
- **File**: `docs/VERCEL_DEPLOYMENT.md`
- **Contains**: Step-by-step instructions for deploying to Vercel

---

## How It Works

```
Development (Local):
Browser → localhost:3000 → localhost:3001/rpc → Casper Testnet
                          → GCP:8080 (compilation)

Production (Vercel):
Browser → your-app.vercel.app → /api/rpc → Casper Testnet
                               → GCP:8080 (compilation)
```

---

## Quick Deploy to Vercel

### Option 1: Via GitHub (Recommended)

```bash
# 1. Push to GitHub
git add .
git commit -m "Add Vercel deployment support"
git push

# 2. Go to vercel.com
# 3. Import your repository
# 4. Set environment variables:
#    VITE_COMPILER_SERVICE_URL = http://20.193.142.1:8080
#    GEMINI_API_KEY = your_key
# 5. Deploy!
```

### Option 2: Via CLI

```bash
npm i -g vercel
cd c:\Users\jayas\Videos\SIS\CasperIDE\IDE
vercel
```

---

## Local Development

For local development, run both servers:

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: RPC Proxy
node proxy-server.cjs
```

---

## Environment Variables Needed on Vercel

```
VITE_COMPILER_SERVICE_URL=http://20.193.142.1:8080
GEMINI_API_KEY=your_api_key_here
```

---

## Testing After Deployment

1. Visit your Vercel URL
2. **Test Compilation**: Compile a contract (should use GCP at 20.193.142.1:8080)
3. **Test Deployment**: Deploy a contract (should use `/api/rpc` serverless function)

---

## Files Created

- ✅ `api/rpc.js` - Vercel serverless function for RPC proxy
- ✅ `vercel.json` - Vercel configuration
- ✅ `docs/VERCEL_DEPLOYMENT.md` - Comprehensive deployment guide

## Files Modified

- ✅ `services/casper/deployment.ts` - Auto-detect RPC endpoint

---

**You're all set!** Follow `docs/VERCEL_DEPLOYMENT.md` for detailed deployment instructions.
