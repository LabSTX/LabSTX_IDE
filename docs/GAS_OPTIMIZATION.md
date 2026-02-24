# Casper Gas Fee & Optimization Guide

## Gas Fee Basics

| Concept | Value |
|---------|-------|
| **Base gas price** | 1 mote per gas unit |
| **1 CSPR** | 10^9 motes (1 billion) |
| **Gas refund** | **99% of unspent gas** (Peregrine upgrade) |
| **Dynamic pricing** | Based on network utilization |

---

## Fresh Deploy vs Upgrade Costs

| Operation | Typical Cost | Notes |
|-----------|-------------|-------|
| **Simple Counter** (fresh) | ~50-100 CSPR | Minimal code, no entry points |
| **Upgradeable V1** (fresh) | ~150-200 CSPR | Creates package + entry points |
| **Upgrade (V2, V3...)** | ~100-150 CSPR | Adds version to existing package |

### Key Insights

1. **Upgrades cost less than fresh deploys** - No new package creation
2. **99% gas refund** - If you send 200 CSPR but only use 50 CSPR worth, you get ~148.5 CSPR back
3. **Cost = Gas Used × Gas Price** - Only pay for what you actually use

---

## Gas Optimization Tips

### 1. Cargo.toml Optimizations

```toml
[profile.release]
lto = true           # Link-time optimization
codegen-units = 1    # Single codegen unit for better optimization
opt-level = "z"      # Optimize for size (smallest binary)
```

### 2. Code Optimizations

```rust
// ✅ DO: Use #![no_std]
#![no_std]
#![no_main]

// ✅ DO: Minimize storage operations
// Read once, modify in memory, write once
let counter_uref = runtime::get_key(KEY).into_uref();
let value = storage::read(counter_uref);
storage::write(counter_uref, value + 1);

// ❌ DON'T: Multiple storage reads/writes
for i in 0..10 {
    let value = storage::read(counter_uref);  // BAD: reads 10 times
    storage::write(counter_uref, value + 1);  // BAD: writes 10 times
}

// ✅ DO: Use constants instead of storage for unchanging data
const MAX_VALUE: u64 = 1000;  // Free - built into code

// ❌ DON'T: Store constants in storage
storage::new_uref(1000u64);  // Costs gas every access
```

### 3. WASM Size Optimization

| Tool | Purpose | Command |
|------|---------|---------|
| **wasm-opt** | Optimize WASM binary | `wasm-opt -Oz input.wasm -o output.wasm` |
| **wasm-strip** | Remove debug info | `wasm-strip contract.wasm` |
| **wasm-snip** | Remove unused code | `wasm-snip --snip-rust-panicking-code contract.wasm` |

### 4. Storage Best Practices

| Practice | Gas Impact |
|----------|------------|
| Store minimal data on-chain | ⬇️ Low cost |
| Use off-chain storage (IPFS) for large data | ⬇️ Low cost |
| Batch multiple operations in one call | ⬇️ Lower overhead |
| Avoid redundant storage reads | ⬇️ Saves gas |
| Use URefs efficiently | ⬇️ Cheaper than re-computing keys |

---

## CasperIDE Default Settings

Our templates already include optimal settings:

```toml
[profile.release]
lto = true
codegen-units = 1
opt-level = "z"

[lib]
crate-type = ["cdylib"]
```

The GCP server also runs `wasm-opt -Oz` automatically on compiled WASM.

---

## Recommended Payment Amounts

| Contract Type | Recommended CSPR | Notes |
|---------------|-----------------|-------|
| Simple contract | 100 CSPR | Basic, no entry points |
| Upgradeable V1 | **200 CSPR** | Package creation is expensive |
| Upgrades (V2+) | **150 CSPR** | Less than fresh deploy |
| Entry point calls | 10-50 CSPR | Depends on logic complexity |

> **Remember:** You get 99% back on unspent gas!

---

## Quick Reference

```
┌─────────────────────────────────────────────────────────────────┐
│ GAS OPTIMIZATION CHEATSHEET                                     │
├─────────────────────────────────────────────────────────────────┤
│ Cargo.toml:                                                     │
│   lto = true              (smaller binary)                      │
│   codegen-units = 1       (better optimization)                 │
│   opt-level = "z"         (size over speed)                     │
├─────────────────────────────────────────────────────────────────┤
│ Code:                                                           │
│   #![no_std]              (no standard library)                 │
│   Minimize storage ops    (read once, write once)               │
│   Use constants           (free, built into code)               │
│   Remove unused imports   (smaller binary)                      │
├─────────────────────────────────────────────────────────────────┤
│ Tools:                                                          │
│   wasm-opt -Oz            (optimize binary)                     │
│   wasm-strip              (remove debug info)                   │
├─────────────────────────────────────────────────────────────────┤
│ Payments:                                                       │
│   Fresh deploy: 200 CSPR  (with 99% refund on unused)           │
│   Upgrade: 150 CSPR       (with 99% refund on unused)           │
│   Simple call: 10-50 CSPR                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Future: Casper 2.0 (Condor) Improvements

- **100% gas refunds** in some scenarios
- **Gas-free transactions** for certain operations
- **Account/contract unification** - more efficient
