# 🚨 URGENT FIX NEEDED: CORS Issue

## Problem Identified
Your GCP server is running and reachable, but the browser is blocking requests due to **CORS (Cross-Origin Resource Sharing)** policy.

## What's Happening
- ✅ GCP VM is running (104.198.31.220:8080)
- ✅ Port 8080 is open and reachable
- ✅ Health endpoint works
- ❌ Browser blocks POST /compile requests (CORS error)

## Quick Fix (Do This Now!)

### Option 1: SSH into GCP VM and Update Server

1. **SSH into your GCP VM:**
   ```bash
   # From GCP Console, click SSH button next to your VM
   ```

2. **Navigate to service directory:**
   ```bash
   cd ~/casper-compiler-service
   ```

3. **Install CORS package:**
   ```bash
   npm install cors
   ```

4. **Edit server.js:**
   ```bash
   nano server.js
   ```

5. **Add these lines at the top (after `const app = express();`):**
   ```javascript
   const cors = require('cors');
   app.use(cors());
   ```

   Your server.js should look like:
   ```javascript
   const express = require("express");
   const multer = require("multer");
   const cors = require("cors");  // ← ADD THIS
   // ... other requires ...

   const app = express();
   const upload = multer();

   app.use(cors());  // ← ADD THIS

   // ... rest of your code ...
   ```

6. **Save and exit:**
   - Press `Ctrl+O` to save
   - Press `Enter` to confirm
   - Press `Ctrl+X` to exit

7. **Restart the service:**
   ```bash
   # Stop the current server (Ctrl+C if running)
   # Then start it again:
   node server.js
   ```

8. **Verify it's running:**
   You should see:
   ```
   Compiler service running on port 8080
   ```

### Option 2: Use the Template File

Even better - replace your entire server.js with the improved version:

1. **SSH into GCP VM**

2. **Backup current server:**
   ```bash
   cd ~/casper-compiler-service
   cp server.js server.js.backup
   ```

3. **Create new server.js with this content:**
   ```bash
   nano server.js
   ```

4. **Copy the ENTIRE content from:**
   `c:\Users\jayas\Videos\SIS\CasperIDE\IDE\gcp-server-template.js`

5. **Paste it into the nano editor**

6. **Save (Ctrl+O, Enter, Ctrl+X)**

7. **Install dependencies:**
   ```bash
   npm install cors
   ```

8. **Restart:**
   ```bash
   node server.js
   ```

## After Fixing

1. **Test the health endpoint in browser:**
   ```
   http://104.198.31.220:8080/health
   ```
   Should return JSON (not blocked)

2. **Try compiling in CasperIDE:**
   - Click Compile button
   - Should now work!

## How to Verify CORS is Fixed

Run this in your browser console (F12):
```javascript
fetch('http://104.198.31.220:8080/health', {
  method: 'GET',
  mode: 'cors'
})
.then(r => r.json())
.then(d => console.log('✓ CORS working!', d))
.catch(e => console.error('✗ CORS still blocked:', e));
```

If you see `✓ CORS working!` - you're good!

## Why This Happens

Browsers block requests from `http://localhost:3000` (your frontend) to `http://104.198.31.220:8080` (your GCP server) unless the server explicitly allows it with CORS headers.

The `cors` package adds these headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, ...
```

## Alternative: Quick Test Without CORS

If you want to test compilation without fixing CORS first, you can use this in browser console:

```javascript
// Create test Rust code
const testCode = `#![no_std]
#![no_main]

extern crate alloc;
use alloc::string::String;
use casper_contract::contract_api::{runtime, storage};
use casper_types::Key;

#[no_mangle]
pub extern "C" fn call() {
    let message: String = runtime::get_named_arg("message");
    let message_uref = storage::new_uref(message);
    runtime::put_key("my_value", Key::URef(message_uref));
}`;

// Test compilation
const formData = new FormData();
formData.append('source', new Blob([testCode]), 'lib.rs');

fetch('http://104.198.31.220:8080/compile', {
  method: 'POST',
  body: formData,
  mode: 'no-cors'  // This bypasses CORS but you won't see the response
})
.then(() => console.log('Request sent (no-cors mode)'))
.catch(e => console.error('Failed:', e));
```

But this won't let you see the response, so **fixing CORS is the proper solution**.

---

## Summary

**The issue:** CORS blocking browser requests  
**The fix:** Add `cors` package to your GCP server  
**Time needed:** 2-3 minutes  
**After fix:** Compilation will work perfectly!

Do this now, then try compiling again in CasperIDE! 🚀
