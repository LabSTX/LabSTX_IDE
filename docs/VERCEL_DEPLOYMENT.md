# 🚀 Deploying CasperIDE to Vercel

This guide covers deploying CasperIDE to Vercel with the RPC proxy as a serverless function.

## Architecture on Vercel

```
┌──────────────────────────────────────┐
│         Vercel Platform              │
│                                      │
│  ┌────────────────────────────┐     │
│  │  Static Frontend (Vite)    │     │
│  │  https://your-app.vercel.app│    │
│  └────────────┬───────────────┘     │
│               │                      │
│  ┌────────────▼───────────────┐     │
│  │  Serverless Function       │─────┼──► Casper Testnet
│  │  /api/rpc                  │     │    (RPC nodes)
│  └────────────────────────────┘     │
│               │                      │
└───────────────┼──────────────────────┘
                │
                ▼
        GCP Compiler VM
        (Port 8080)
```

## Prerequisites

- GitHub account
- Vercel account (free tier works!)
- GCP compiler service running

## Step 1: Prepare Your Environment Variables

Create a `.env.production` file (don't commit this!):

```env
VITE_COMPILER_SERVICE_URL=http://20.193.142.1:8080
GEMINI_API_KEY=your_api_key_here
```

## Step 2: Update Frontend to Use Vercel API Route

The RPC calls should go to `/api/rpc` instead of `localhost:3001/rpc` when deployed.

You can detect the environment automatically:

```javascript
// In your RPC service file
const RPC_ENDPOINT = import.meta.env.PROD 
  ? '/api/rpc'  // Vercel serverless function
  : 'http://localhost:3001/rpc';  // Local development
```

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to IDE folder
cd c:\Users\jayas\Videos\SIS\CasperIDE\IDE

# Login to Vercel
vercel login

# Deploy
vercel

# For production deployment
vercel --prod
```

### Option B: Deploy via GitHub (Recommended)

1. **Push your code to GitHub**:
   ```bash
   cd c:\Users\jayas\Videos\SIS\CasperIDE
   git add .
   git commit -m "Add Vercel deployment config"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Vite

3. **Configure Build Settings**:
   - **Framework Preset**: Vite
   - **Root Directory**: `IDE`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Add Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add `VITE_COMPILER_SERVICE_URL` = `http://20.193.142.1:8080`
   - Add `GEMINI_API_KEY` = your API key

5. **Deploy**:
   - Click "Deploy"
   - Wait 1-2 minutes
   - Your app will be live at `https://your-project.vercel.app`

## Step 4: Test Your Deployment

1. Visit your Vercel URL
2. Try compiling a contract (should use GCP server)
3. Try deploying a contract (should use `/api/rpc` serverless function)

## Local Development

For local development, you still need the proxy server:

```bash
# Terminal 1: Run dev server
npm run dev

# Terminal 2: Run proxy
node proxy-server.cjs
```

## Troubleshooting

### Issue: "RPC endpoint not found"

**Solution**: Make sure `vercel.json` is in the `IDE` folder and properly configured.

### Issue: "CORS errors"

**Solution**: Check that the CORS headers are set in `vercel.json` and `api/rpc.js`.

### Issue: "Compilation fails"

**Solution**: Verify your GCP VM is running and firewall allows port 8080.

### Issue: "Environment variables not working"

**Solution**: 
- Make sure they start with `VITE_` prefix
- Redeploy after adding variables
- Check in Vercel dashboard: Settings → Environment Variables

## Cost Considerations

- **Vercel Free Tier**: 
  - 100 GB bandwidth/month
  - Unlimited deployments
  - Serverless function executions included
  - Perfect for development/demo

- **GCP VM**: 
  - Keep running only when needed
  - Consider `e2-micro` for minimal cost
  - Stop VM when not in use

## Auto-Deploy from Git

Once connected to GitHub, every push to `main` automatically deploys!

```bash
git add .
git commit -m "Update contract templates"
git push
# Vercel automatically deploys! 🎉
```

## Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as shown
4. SSL automatically provisioned

---

**Your CasperIDE will be live and accessible from anywhere!** 🚀
