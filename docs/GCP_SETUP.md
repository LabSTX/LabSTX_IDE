# 🚀 Connecting CasperIDE to GCP Compilation Service

This guide will help you connect your CasperIDE frontend to the GCP VM compilation service you've set up.

## ✅ Prerequisites

You should have already completed:
- ✓ Created a GCP VM instance
- ✓ Installed Rust toolchain on the VM
- ✓ Set up the Node.js compilation service on port 8080
- ✓ Configured GCP firewall to allow port 8080

---

## 📝 Step 1: Get Your GCP VM External IP

1. Go to **Google Cloud Console** → **Compute Engine** → **VM instances**
2. Find your `casper-compiler-vm` instance
3. Copy the **External IP** address (e.g., `34.93.123.45`)

---

## 🔧 Step 2: Configure Environment Variables

1. Open the `.env` file in the `IDE` folder
2. Replace `YOUR_GCP_VM_IP` with your actual external IP:

```env
# Example:
VITE_COMPILER_SERVICE_URL=http://34.93.123.45:8080
```

3. (Optional) Add your Gemini API key for AI assistant:

```env
GEMINI_API_KEY=your_actual_api_key_here
```

---

## 🧪 Step 3: Test the Connection

### Option A: Test from Browser Console

1. Start your dev server: `npm run dev`
2. Open the IDE in browser: `http://localhost:3000`
3. Open browser DevTools (F12)
4. Run this in the console:

```javascript
const testCode = `#![no_std]
#![no_main]

extern crate alloc;
use alloc::string::String;
use casper_contract::{
    contract_api::{runtime, storage},
    unwrap_or_revert::UnwrapOrRevert,
};
use casper_types::Key;

#[no_mangle]
pub extern "C" fn call() {
    let message: String = runtime::get_named_arg("message");
    let message_uref = storage::new_uref(message);
    let key = Key::URef(message_uref);
    runtime::put_key("my_value", key);
}`;

const formData = new FormData();
const blob = new Blob([testCode], { type: 'text/plain' });
formData.append('source', blob, 'lib.rs');

fetch('http://YOUR_GCP_VM_IP:8080/compile', {
  method: 'POST',
  body: formData,
})
.then(res => res.blob())
.then(wasm => console.log('✓ Compilation successful! WASM size:', wasm.size, 'bytes'))
.catch(err => console.error('✗ Compilation failed:', err));
```

### Option B: Test from the IDE

1. Open CasperIDE in your browser
2. Navigate to the default `main.rs` file
3. Click the **Compile** button (or press the compile icon)
4. Check the **Terminal** panel for compilation output
5. If successful, you'll see: `✓ Compilation successful! WASM size: XXXX bytes`

---

## 🔍 Troubleshooting

### Issue: "Failed to connect to compilation service"

**Possible causes:**
1. **GCP VM is not running**
   - Go to GCP Console and start the VM

2. **Firewall not configured**
   - Check GCP firewall rules allow TCP port 8080
   - Run: `sudo ufw status` on VM (if using UFW)

3. **Compilation service not running**
   - SSH into your VM
   - Navigate to: `cd ~/casper-compiler-service`
   - Start the service: `node server.js`
   - Should see: `Compiler service running on port 8080`

4. **Wrong IP address in .env**
   - Double-check the external IP in GCP Console
   - Ensure you're using `http://` not `https://`

### Issue: CORS Error

If you see CORS errors in the browser console, update your GCP server.js:

```javascript
// Add this BEFORE your routes
const cors = require('cors');
app.use(cors());
```

Then install cors:
```bash
npm install cors
```

Restart the service.

### Issue: "Compile failed" with details

This means the Rust code has syntax errors. Check:
- Missing dependencies in Cargo.toml
- Syntax errors in Rust code
- Check the error details in the Terminal panel

---

## 🎯 How It Works

```
┌─────────────────┐
│  CasperIDE UI   │
│  (Your Browser) │
└────────┬────────┘
         │
         │ 1. Send Rust source code
         │    via HTTP POST /compile
         ▼
┌─────────────────┐
│   GCP VM        │
│  (Ubuntu 22.04) │
│                 │
│  ┌───────────┐  │
│  │ Node.js   │  │ 2. Create temp Cargo project
│  │ Express   │  │ 3. Write source to lib.rs
│  │ Server    │  │ 4. Run: cargo build --release
│  └───────────┘  │    --target wasm32-unknown-unknown
│                 │
│  ┌───────────┐  │
│  │   Rust    │  │ 5. Compile to WASM
│  │ Compiler  │  │
│  └───────────┘  │
└────────┬────────┘
         │
         │ 6. Return compiled .wasm binary
         ▼
┌─────────────────┐
│  CasperIDE UI   │ 7. Display success/errors
│                 │ 8. Store WASM for deployment
└─────────────────┘
```

---

## 🔐 Security Notes

**⚠️ IMPORTANT:** The current setup is for **DEVELOPMENT ONLY**

For production, you MUST:

1. **Add authentication** - Don't allow public compilation
2. **Use Docker sandboxing** - Isolate compilation in containers
3. **Add rate limiting** - Prevent abuse
4. **Resource limits** - Timeout long compilations
5. **Use HTTPS** - Secure the connection
6. **Restrict firewall** - Only allow your frontend's IP

---

## 🎉 Next Steps

Once compilation is working:

1. **Test with different contracts** - Try the example templates
2. **Deploy to Casper** - Use the Deploy panel to deploy compiled WASM
3. **Monitor VM resources** - Check if you need to upgrade the VM size
4. **Set up auto-start** - Make the service start on VM boot:

```bash
# On your GCP VM
sudo npm install -g pm2
cd ~/casper-compiler-service
pm2 start server.js --name casper-compiler
pm2 startup
pm2 save
```

---

## 📚 Additional Resources

- [Casper Documentation](https://docs.casper.network/)
- [Rust WASM Book](https://rustwasm.github.io/docs/book/)
- [GCP Compute Engine Docs](https://cloud.google.com/compute/docs)

---

## 💡 Tips

- **Keep the VM running** during development
- **Check VM logs** if compilation fails: `journalctl -u node`
- **Monitor costs** in GCP Console
- **Use `e2-micro`** for testing (cheaper), upgrade for production
- **Set up billing alerts** to avoid surprises

---

Need help? Check the terminal output in the IDE for detailed error messages!
