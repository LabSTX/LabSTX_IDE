# ✅ Setup Checklist - Connect CasperIDE to GCP

Follow these steps in order. Check off each one as you complete it.

---

## 📋 Pre-Flight Checklist

### GCP VM Setup (You've already done this!)
- [x] Created GCP VM instance
- [x] Installed Rust toolchain
- [x] Installed Node.js
- [x] Created compilation service
- [x] Configured firewall for port 8080

---

## 🎯 Connection Setup (Do this now!)

### Step 1: Get GCP VM IP
- [ ] Go to: https://console.cloud.google.com/compute/instances
- [ ] Find VM: `casper-compiler-vm`
- [ ] Copy External IP: `___.___.___.___ ` (write it down!)

### Step 2: Configure Environment
- [ ] Open file: `c:\Users\jayas\Videos\SIS\CasperIDE\IDE\.env`
- [ ] Replace `YOUR_GCP_VM_IP` with your actual IP
- [ ] Save the file
- [ ] Verify: `cat .env` shows correct IP

### Step 3: Update GCP Server (Recommended)
- [ ] SSH into your GCP VM
- [ ] Run: `cd ~/casper-compiler-service`
- [ ] Run: `npm install cors`
- [ ] Update `server.js` with code from `gcp-server-template.js`
  - Or manually add CORS support

### Step 4: Start GCP Service
- [ ] On GCP VM, run: `cd ~/casper-compiler-service`
- [ ] Run: `node server.js`
- [ ] Verify you see: "Server running on port 8080"
- [ ] Keep this terminal open!

### Step 5: Test Health Check
- [ ] Open browser
- [ ] Go to: `http://YOUR_GCP_VM_IP:8080/health`
- [ ] Verify you see JSON response with "status": "ok"

### Step 6: Start Frontend
- [ ] Open new terminal
- [ ] Run: `cd c:\Users\jayas\Videos\SIS\CasperIDE\IDE`
- [ ] Run: `npm run dev`
- [ ] Verify you see: "Local: http://localhost:3000"

### Step 7: Test Compilation
- [ ] Open browser: http://localhost:3000
- [ ] Click on `main.rs` in file explorer
- [ ] Click **Compile** button (play icon in toolbar)
- [ ] Check Terminal panel at bottom
- [ ] Verify you see: "Compilation successful! WASM size: XXXX bytes"
- [ ] Verify NO "mock compilation" warning

---

## 🔍 Verification Tests

### Test 1: Browser Console
- [ ] Open DevTools (F12)
- [ ] Go to Console tab
- [ ] Compile a contract
- [ ] Look for: `✓ Compilation successful! WASM size: XXXX bytes`
- [ ] No errors in console

### Test 2: GCP VM Logs
- [ ] Check GCP VM terminal
- [ ] Should see: "Starting compilation..."
- [ ] Should see: "✓ Compilation successful!"
- [ ] Should see WASM size and compilation time

### Test 3: Network Tab
- [ ] Open DevTools → Network tab
- [ ] Compile a contract
- [ ] Look for POST request to: `YOUR_IP:8080/compile`
- [ ] Status should be: 200 OK
- [ ] Response type: application/wasm

---

## 🚨 Troubleshooting Checklist

If compilation fails, check these:

### Connection Issues
- [ ] GCP VM is running (check GCP Console)
- [ ] Service is running on VM (`node server.js`)
- [ ] Firewall allows port 8080
- [ ] `.env` file has correct IP
- [ ] Using `http://` not `https://`

### CORS Issues
- [ ] Installed `cors` package on VM
- [ ] Updated server.js with CORS support
- [ ] Restarted service after changes

### Compilation Issues
- [ ] Rust code has no syntax errors
- [ ] VM has enough disk space: `df -h`
- [ ] VM has enough memory (consider upgrading)

---

## 🎉 Success Criteria

You're done when ALL of these are true:

- [ ] Health check returns JSON
- [ ] Frontend loads without errors
- [ ] Compile button works
- [ ] Terminal shows "Compilation successful"
- [ ] WASM size is realistic (10KB+, not just 8 bytes)
- [ ] No "mock compilation" warning
- [ ] GCP VM logs show compilation activity
- [ ] Compilation takes 3-10 seconds (not instant)

---

## 📝 Notes Section

Write down any issues or observations:

```
Issue 1: _______________________________________________

Solution: ______________________________________________


Issue 2: _______________________________________________

Solution: ______________________________________________


```

---

## 🚀 Next Steps After Success

Once everything works:

- [ ] Test with Counter template
- [ ] Test with Hello World template
- [ ] Try deploying to Casper testnet
- [ ] Set up PM2 for auto-restart (see GCP_SETUP.md)
- [ ] Monitor GCP costs
- [ ] Consider upgrading VM if slow

---

## 📞 Quick Reference

- **Frontend**: http://localhost:3000
- **GCP Health**: http://YOUR_IP:8080/health
- **Docs**: See INTEGRATION_SUMMARY.md
- **Detailed Setup**: See GCP_SETUP.md
- **Quick Help**: See QUICKSTART.md

---

**Current Status**: [ ] Not Started  [ ] In Progress  [ ] Complete ✅

**Date Started**: _______________

**Date Completed**: _______________
