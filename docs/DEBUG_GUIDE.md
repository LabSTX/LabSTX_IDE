# 🐛 Debugging Compilation Issues

## Current Status
- ✅ GCP VM is running and responding (health check passed)
- ✅ Frontend is running on http://localhost:3000
- ✅ Code updated to handle trailing slashes
- ⚠️ Compilation failing - need to check error details

## Steps to Debug

### 1. Check Browser Console
1. Open DevTools (F12)
2. Go to **Console** tab
3. Click **Compile** button in IDE
4. Look for error messages

**What to look for:**
- `Failed to connect` → Network/firewall issue
- `CORS error` → Need to add CORS to GCP server
- `404 Not Found` → Wrong URL or endpoint
- `Compilation failed` → Rust code error

### 2. Check IDE Output Panel
1. In CasperIDE, look at bottom panel
2. Click **Output** tab
3. Read the compilation output

**What to look for:**
- Rust compiler errors
- Missing dependencies
- Syntax errors

### 3. Check IDE Problems Panel
1. Click **Problems** tab (next to Output)
2. See specific error locations

### 4. Check Network Tab
1. Open DevTools → **Network** tab
2. Click **Compile** button
3. Look for POST request to `104.198.31.220:8080/compile`

**Check:**
- Status code (should be 200)
- Response type (should be application/wasm)
- Response size (should be > 1KB)

### 5. Check GCP VM Logs
If you have SSH access to your GCP VM:
```bash
# The terminal running node server.js should show:
[timestamp] Starting compilation...
[timestamp] ✓ Compilation successful!
```

If you see errors there, that's the actual compilation failing.

## Common Issues & Fixes

### Issue: "VITE_COMPILER_SERVICE_URL not set"
**Cause:** Environment variable not loaded
**Fix:**
1. Check `.env` file exists
2. Restart dev server: Ctrl+C, then `npm run dev`
3. Environment variables only load on server start

### Issue: CORS Error
**Cause:** GCP server doesn't have CORS enabled
**Fix:**
```bash
# On GCP VM:
cd ~/casper-compiler-service
npm install cors

# Update server.js to include:
const cors = require('cors');
app.use(cors());

# Restart server
node server.js
```

### Issue: "Failed to fetch"
**Cause:** Network connectivity issue
**Fix:**
1. Check GCP VM is running
2. Check firewall allows port 8080
3. Test: `curl http://104.198.31.220:8080/health`

### Issue: "Compilation failed" with Rust errors
**Cause:** Actual Rust code has errors
**Fix:**
1. Read the error message in Output panel
2. Fix the Rust code
3. Common issues:
   - Missing `#![no_std]`
   - Missing `#![no_main]`
   - Wrong function signature
   - Missing dependencies

## Quick Test

Run this in browser console to test connection:
```javascript
fetch('http://104.198.31.220:8080/health')
  .then(r => r.json())
  .then(d => console.log('✓ Health check:', d))
  .catch(e => console.error('✗ Health check failed:', e));
```

Should print:
```
✓ Health check: {status: "ok", message: "...", timestamp: "..."}
```

## Next Steps

1. **Check browser console** for the actual error
2. **Check Output panel** in IDE for compilation details
3. **Test health endpoint** to verify connection
4. **Check GCP VM logs** if compilation reaches the server

## Current Configuration

- **GCP VM IP:** 104.198.31.220
- **Port:** 8080
- **Health Check:** http://104.198.31.220:8080/health
- **Compile Endpoint:** http://104.198.31.220:8080/compile
- **Frontend:** http://localhost:3000

---

**After checking these, report back with:**
1. What the browser console says
2. What the Output panel shows
3. What the Network tab shows for the /compile request
