# Deploying the Clarity Backend API

Since this backend relies on the **Clarinet CLI binary**, it cannot be deployed to standard serverless platforms like Vercel or Netlify (which don't allow installing custom Rust binaries). You need a environment where you can install `clarinet`.

## 🏗️ Option 1: Docker (Recommended)
This is the most stable way to deploy. Use a Node.js base image and install Clarinet.

### 1. Create a `Dockerfile` in the root:
```dockerfile
FROM node:20-slim

# Install dependencies for Clarinet
RUN apt-get update && apt-get install -y curl unzip

# Install Clarinet
RUN curl -L https://github.com/hirosystems/clarinet/releases/download/v2.11.0/clarinet-linux-x64-glibc.tar.gz -o clarinet.tar.gz \
    && tar -xzf clarinet.tar.gz \
    && mv ./clarinet /usr/local/bin/ \
    && chmod +x /usr/local/bin/clarinet

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 5001
CMD ["npx", "tsx", "api/index.ts"]
```

### 2. Deployment Platforms for Docker:
- **Render.com**: Create a "Web Service" and point to your repo. It will detect the Dockerfile.
- **Railway.app**: Simply push your code; Railway will build the Dockerfile automatically.
- **Fly.io**: Use `fly launch` to deploy the container.

---

## ☁️ Option 2: VPS (DigitalOcean / AWS EC2 / Ubuntu)
If you are using a raw Linux server:

1. **Install Node.js & Clarinet:**
   ```bash
   # Install Clarinet
   wget https://github.com/hirosystems/clarinet/releases/download/v2.11.0/clarinet-linux-x64-glibc.tar.gz
   tar -xf clarinet-linux-x64-glibc.tar.gz
   sudo mv clarinet /usr/local/bin
   ```

2. **Clone and Run:**
   ```bash
   git clone <your-repo>
   cd IDE
   npm install
   # Use PM2 to keep the server running
   npm install -g pm2
   pm2 start "npx tsx api/index.ts" --name clarity-api
   ```

---

## 🔧 Updating the Frontend Config
Once deployed, you must update the `vite.config.ts` or your environment variables to point to the new URL:

```typescript
// vite.config.ts
proxy: {
  '/api/clarity': {
    target: process.env.VITE_BACKEND_URL || 'http://your-deployed-api.com',
    changeOrigin: true,
  }
}
```

## ⚠️ Important Considerations
- **Disk Space**: The API creates temporary folders in `/tmp`. The code includes `fs.rmSync` in the `finally` block, but ensure the server has enough write permissions.
- **Security**: This API executes shell commands via `exec`. It is currently designed for a trusted development environment. For a public production release, add rate limiting and strict input sanitization.
