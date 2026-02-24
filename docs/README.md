# **Casper Web IDE**  
*A Browser-Based Smart Contract Playground for the Casper Blockchain*

![Caspier - Inspired by Remix](CASPIER.png)

---

##  **Overview**

**Casper Web IDE** is a fully browser-based development environment inspired by Ethereum’s Remix IDE, but purpose-built for the **Casper Network**. It allows developers to write, compile, deploy, test, and debug Casper smart contracts directly in the browser—without installing Rust, cargo-casper, or any command-line tools.

The IDE supports **Rust and AssemblyScript** smart contracts, providing a smooth, beginner-friendly onboarding flow while remaining powerful enough for advanced developers.

---

## ✨ **Features**

###  **1. In-Browser Code Editor**
- Syntax highlighting for Rust & AssemblyScript  
- Monaco Editor-powered workspace  
- Multiple file tabs  
- Real-time error highlighting  

###  **2. WASM Compilation in the Browser**
- Rust smart contracts compiled to `.wasm` using WebAssembly-enabled toolchains  
- AssemblyScript contracts compiled using AS → WASM pipeline  
- No local environment setup required  

###  **3. Contract Deployment Module**
- Deploy compiled WASM to Casper testnet  
- Connect wallet (Casper Wallet / Ledger / Casper Signer)  
- Configure values, entrypoints, gas, and runtime arguments  
- View deploy hash + stored contract hash  

###  **4. Execution & Testing**
- Run contract entrypoints directly from the UI  
- Auto-generated UI controls for arguments  
- View transaction status, logs, and stored values  

###  **5. Debugging Tools**
- WASM bytecode viewer  
- Contract metadata inspector  
- Deploy visualization   

###  **6. File Import & Export**
- Import sample Casper tutorials  
- Save contract workspace locally  
- Export compiled WASM artifacts  

---

##  **Architecture**

```
Casper Web IDE
│
├── Frontend (Next.js / React)
│   ├── Monaco Editor
│   ├── Rust & AS syntax plugins
│   ├── File system sandbox
│   └── WASM compiler runners
│
├── WASM Build Engine (Browser)
│   ├── rustc/cargo-wasm (WebAssembly port)
│   ├── AssemblyScript compiler
│   └── wasm-opt for optimization
│
├── Casper SDK Layer
│   ├── casper-js-sdk
│   ├── deploy builders
│   └── signing integrations
│
└── Optional Backend (Node.js)
    ├── template storage
    ├── analytics
    └── contract examples
```

---

## 📁 **Folder Structure**

```
/casper-web-ide
│
├── public/
├── src/
│   ├── components/
│   │   ├── Editor/
│   │   ├── Compiler/
│   │   ├── DeployPanel/
│   │   └── OutputConsole/
│   ├── pages/
│   ├── utils/
│   ├── compilers/
│   │   ├── rust-wasm/
│   │   └── as-wasm/
│   └── services/
│       └── casper/
│
├── examples/
│   ├── counter-rust/
│   └── ft-assemblyscript/
│
└── README.md
```

---

##  **Tech Stack**

| Component | Technology |
|----------|------------|
| Editor | Monaco Editor |
| Frontend | Next.js + React |
| Language Support | Rust, AssemblyScript |
| Contract Deployment | casper-js-sdk |
| WASM Compilation | Rust WebAssembly toolchain + AS compiler |
| Storage | Local browser sandbox |

---

##  **Getting Started**

### **1. Clone the repo**
```bash
git clone https://github.com/yourusername/casper-web-ide.git
cd casper-web-ide/IDE
```

### **2. Install dependencies**
```bash
npm install
```

### **3. Configure environment variables**

Create a `.env` file in the `IDE` folder:

```bash
cp .env.example .env
```

Edit `.env` and add:
- **GEMINI_API_KEY** - Your Google Gemini API key (optional, for AI assistant)
- **VITE_COMPILER_SERVICE_URL** - Your GCP compilation service URL

Example:
```env
GEMINI_API_KEY=your_gemini_api_key_here
VITE_COMPILER_SERVICE_URL=http://34.93.123.45:8080
```

> **Note:** For real Rust compilation, you need to set up a GCP VM with the compilation service.  
> See [GCP_SETUP.md](./GCP_SETUP.md) for detailed instructions.

### **4. Start the development server**
```bash
npm run dev
```

### **5. Open in browser**
```
http://localhost:3000
```

---

##  **Running a Sample Contract**

1. Go to **Examples** panel  
2. Select **Counter (Rust)**  
3. Click **Compile**  
4. Connect Casper Wallet  
5. Hit **Deploy**  

---

##  **Roadmap**

###  Phase 1  
- Rust IDE + WASM compiler  
- Basic deployment flows  
- Example templates  

###  Phase 2  
- Full AssemblyScript support  
- In-browser test runner  

### 🔜 Phase 3  
- AI-assisted contract generation  
- Contract analyzer (security checks)  
- Marketplace for contract templates  
- Live collaboration features (like VS Code Live Share)

---

## 📜 **License**

MIT License.
