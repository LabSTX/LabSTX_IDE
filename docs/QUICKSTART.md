# 🎯 Quick Start - Connect to GCP Compiler

## What You Need to Do RIGHT NOW:

### 1️⃣ Get Your GCP VM IP Address
- Go to: https://console.cloud.google.com/compute/instances
- Find your VM: `casper-compiler-vm`
- Copy the **External IP** (something like `34.93.123.45`)

### 2️⃣ Update Your .env File
Open: `c:\Users\jayas\Videos\SIS\CasperIDE\IDE\.env`

Replace this line:
```
VITE_COMPILER_SERVICE_URL=http://YOUR_GCP_VM_IP:8080
```

With your actual IP:
```
VITE_COMPILER_SERVICE_URL=http://34.93.123.45:8080
```
(Use YOUR IP, not this example!)

### 3️⃣ Make Sure GCP Service is Running

SSH into your VM and check:
```bash
cd ~/casper-compiler-service
node server.js
```

You should see:
```
Compiler service running on port 8080
```

### 4️⃣ Start Your Frontend

In the IDE folder:
```bash
npm run dev
```

### 5️⃣ Test It!

1. Open: http://localhost:3000
2. Click on `main.rs` in the file explorer
3. Click the **Compile** button (or the play icon)
4. Check the Terminal panel at the bottom

**Success looks like:**
```
Compiling main.rs...
✓ Compilation successful! WASM size: XXXX bytes
```

**Failure looks like:**
```
Failed to connect to compilation service
```

---

## 🚨 If It Doesn't Work

### Check #1: Is the GCP VM running?
- Go to GCP Console
- Start the VM if it's stopped

### Check #2: Is the service running on the VM?
SSH into VM:
```bash
cd ~/casper-compiler-service
node server.js
```

### Check #3: Is the firewall open?
In GCP Console:
- VPC Network → Firewall
- Look for rule allowing TCP:8080
- If missing, create it (see GCP_SETUP.md)

### Check #4: Is the .env file correct?
```bash
# In your IDE folder
cat .env
```

Should show:
```
VITE_COMPILER_SERVICE_URL=http://YOUR_ACTUAL_IP:8080
```

### Check #5: CORS issue?
If you see CORS errors in browser console:

On your GCP VM:
```bash
cd ~/casper-compiler-service
npm install cors
```

Edit `server.js` and add at the top (after `const app = express();`):
```javascript
const cors = require('cors');
app.use(cors());
```

Restart: `node server.js`

---

## ✅ You're Done When...

You can:
1. Write Rust code in the IDE
2. Click Compile
3. See "Compilation successful" in the terminal
4. See actual WASM bytes (not mock data)

---

## 📞 Need More Help?

See the full guide: [GCP_SETUP.md](./GCP_SETUP.md)
