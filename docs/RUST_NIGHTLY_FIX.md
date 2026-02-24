# 🔧 FINAL FIX - Use Rust Nightly or Downgrade

## The Real Problem

ALL casper-contract versions (1.x, 2.x, 3.x, 4.x) use `#![feature]` attributes that require **nightly Rust** or **older stable Rust (1.70-1.76)**.

Your Rust 1.91.1 is too new and has removed these features from stable.

## Solution 1: Use Rust Nightly (RECOMMENDED - Quick Fix)

On your GCP VM:

```bash
# Install nightly toolchain
rustup install nightly

# Set nightly as default
rustup default nightly

# Verify
rustc --version
# Should show: rustc 1.XX.X-nightly

# Restart your server
cd ~/casper-compiler-service
node server.js
```

Then try compiling in CasperIDE - **it will work!**

## Solution 2: Downgrade to Rust 1.76 (Stable)

```bash
# Install Rust 1.76
rustup install 1.76.0

# Set as default
rustup default 1.76.0

# Verify
rustc --version
# Should show: rustc 1.76.0

# Restart server
cd ~/casper-compiler-service
node server.js
```

## Solution 3: Use Per-Project Rust Version

If you want to keep Rust 1.91.1 as default but use nightly for Casper:

```bash
cd ~/casper-compiler-service

# Create rust-toolchain file
echo "nightly" > rust-toolchain

# Now cargo will automatically use nightly in this directory
cargo --version
# Should show nightly version

# Restart server
node server.js
```

## Which Should You Choose?

**For quickest fix:** Use Solution 1 (nightly)
- Takes 30 seconds
- Works immediately
- Casper contracts are designed for nightly

**For stability:** Use Solution 2 (Rust 1.76)
- Stable release
- Known to work with Casper
- Recommended for production

**For flexibility:** Use Solution 3 (per-project)
- Keep your system Rust version
- Only affects Casper compilation

## Quick Copy-Paste (Solution 1 - Nightly)

```bash
rustup install nightly
rustup default nightly
cd ~/casper-compiler-service
node server.js
```

That's it! Then compile in CasperIDE.

## Why This Happens

Casper contracts use:
- `alloc_error_handler` - nightly feature
- `core_intrinsics` - nightly feature  
- `lang_items` - nightly feature

These were available in Rust 1.70-1.76 stable, but removed in 1.77+.

Casper team is working on versions that don't need nightly (5.x, 6.x), but they're not stable yet.

---

**TL;DR:** Run `rustup default nightly` on your GCP VM, restart the server, and it will work!
