# Casper SDK Version Migration Guide

## Overview

This document covers the breaking changes between Casper SDK versions for smart contract development. Use this as a reference when writing Casper contracts.

---

## Version Compatibility Matrix

| Casper Network | casper-contract | casper-types | Rust Toolchain |
|----------------|-----------------|--------------|----------------|
| Casper 1.x     | 3.0.0           | 3.0.0        | nightly-2024-10-01 |
| **Casper 2.0** | **5.0+**        | **6.0+**     | **nightly-2025-01-01** |

---

## Breaking Changes: casper-contract 3.0 → 5.0

### 1. Panic Handler & Allocator

**3.0.0 - Must define manually:**
```rust
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    loop {}
}
```

**5.0+ - Provided by crate (DO NOT include):**
```rust
// Remove #[global_allocator] and #[panic_handler]
// casper-contract 5.0 provides them automatically
```

### 2. `storage::new_contract()` Signature

**3.0.0 - 4 arguments:**
```rust
let (contract_hash, version) = storage::new_contract(
    entry_points,
    Some(named_keys),
    Some(String::from("package_name")),
    Some(String::from("access_uref_name")),
);
```

**5.0+ - 5 arguments (added message_topics):**
```rust
let (contract_hash, version) = storage::new_contract(
    entry_points.into(),        // Note: requires .into()
    Some(named_keys.into()),    // Note: requires .into()
    Some(String::from("package_name")),
    Some(String::from("access_uref_name")),
    None,                       // NEW: message_topics (Option<BTreeMap<String, MessageTopicOperation>>)
);
```

### 3. `storage::add_contract_version()` Signature

**3.0.0 - 3 arguments:**
```rust
let (contract_hash, version) = storage::add_contract_version(
    package_hash,
    entry_points,
    named_keys,
);
```

**5.0+ - 4 arguments (added message_topics):**
```rust
let (contract_hash, version) = storage::add_contract_version(
    package_hash,
    entry_points.into(),        // Note: requires .into()
    named_keys.into(),          // Note: requires .into()
    Default::default(),         // NEW: message_topics (BTreeMap<String, MessageTopicOperation>)
);
```

### 4. Cargo.toml Dependencies

**3.0.0:**
```toml
[dependencies]
casper-contract = { version = "3.0.0", default-features = false }
casper-types = { version = "3.0.0", default-features = false }
wee_alloc = "0.4.5"  # REQUIRED for allocator
```

**5.0+:**
```toml
[dependencies]
casper-contract = "5.0"
casper-types = "6.0"
# wee_alloc NOT needed - casper-contract provides allocator
```

---

## Breaking Changes: casper-types 3.0 → 6.0

### 1. Import Path Changes

**3.0.0:**
```rust
use casper_types::{
    contracts::NamedKeys,
    CLType,
    EntryPoint,
    EntryPointAccess,
    EntryPointType,
    EntryPoints,
    Key,
    URef,
};
```

**6.0+:**
```rust
use casper_types::{
    contracts::{EntryPoint, EntryPoints, NamedKeys},  // EntryPoint moved to contracts::
    EntryPointAccess,  // Root level
    EntryPointType,    // Root level  
    CLType,
    Key,
    URef,
};
```

### 2. EntryPointType Enum Variant Rename

**3.0.0:**
```rust
EntryPointType::Contract  // For contract entry points
EntryPointType::Session   // For session code
```

**6.0+:**
```rust
EntryPointType::Called    // RENAMED from Contract
EntryPointType::Factory   // New type
```

### 3. Type Conversions Required

**6.0+ requires .into() for new_contract:**
```rust
// contracts::EntryPoints → casper_types::EntryPoints
entry_points.into()

// contracts::NamedKeys → casper_types::NamedKeys  
named_keys.into()
```

### 4. ContractPackageHash Import Path

**3.0.0:**
```rust
use casper_types::ContractPackageHash;
```

**6.0+:**
```rust
use casper_types::contracts::ContractPackageHash;  // Moved to contracts module
```

### 5. Key::into_hash() Renamed

**3.0.0:**
```rust
let hash = key.into_hash();  // Returns Option<[u8; 32]>
```

**6.0+:**
```rust
let hash = key.into_hash_addr();  // RENAMED to into_hash_addr()
```

### 6. Parameter Import Path

**3.0.0:**
```rust
use casper_types::Parameter;  // Root level
```

**6.0+:**
```rust
use casper_types::Parameter;  // Still root level (NOT in contracts::)
```

---

## Complete Working Examples

### Simple Counter (Works on Both Versions)

```rust
#![no_std]
#![no_main]

extern crate alloc;

use casper_contract::contract_api::{runtime, storage};
use casper_types::Key;

#[no_mangle]
pub extern "C" fn call() {
    let counter: u64 = 0;
    let counter_uref = storage::new_uref(counter);
    let counter_key = Key::URef(counter_uref);
    runtime::put_key("counter", counter_key);
}
```

### Upgradeable Contract V1 (Casper 2.0 / casper-contract 5.0)

```rust
#![no_std]
#![no_main]

extern crate alloc;

use alloc::string::String;
use alloc::vec;
use casper_contract::contract_api::{runtime, storage};
use casper_contract::unwrap_or_revert::UnwrapOrRevert;
use casper_types::{
    contracts::{EntryPoint, EntryPoints, NamedKeys},
    EntryPointAccess, EntryPointType, CLType, Key, URef,
};

const COUNTER_KEY: &str = "counter";

fn get_entry_points() -> EntryPoints {
    let mut entry_points = EntryPoints::new();

    entry_points.add_entry_point(EntryPoint::new(
        String::from("increment"),
        vec![],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,  // NOT Contract!
    ));

    entry_points.add_entry_point(EntryPoint::new(
        String::from("get_count"),
        vec![],
        CLType::U64,
        EntryPointAccess::Public,
        EntryPointType::Called,
    ));

    entry_points
}

#[no_mangle]
pub extern "C" fn increment() {
    let counter_uref: URef = runtime::get_key(COUNTER_KEY)
        .and_then(|key| key.into_uref())
        .unwrap_or_revert();
    let current: u64 = storage::read(counter_uref)
        .unwrap_or_revert()
        .unwrap_or(0u64);
    storage::write(counter_uref, current + 1);
}

#[no_mangle]
pub extern "C" fn get_count() {
    let counter_uref: URef = runtime::get_key(COUNTER_KEY)
        .and_then(|key| key.into_uref())
        .unwrap_or_revert();
    let count: u64 = storage::read(counter_uref)
        .unwrap_or_revert()
        .unwrap_or(0u64);
    runtime::ret(casper_types::CLValue::from_t(count).unwrap_or_revert());
}

#[no_mangle]
pub extern "C" fn call() {
    let counter_uref = storage::new_uref(0u64);
    let counter_key = Key::URef(counter_uref);
    
    let mut named_keys = NamedKeys::new();
    named_keys.insert(String::from(COUNTER_KEY), counter_key);
    
    let entry_points = get_entry_points();
    
    // 5 arguments in casper-contract 5.0!
    let (stored_contract_hash, _) = storage::new_contract(
        entry_points.into(),
        Some(named_keys.into()),
        Some(String::from("counter_package")),
        Some(String::from("counter_access_uref")),
        None,  // message_topics
    );
    
    runtime::put_key("counter_contract", stored_contract_hash.into());
}
```

---

## GCP Compilation Server Configuration

### For Casper 2.0 (Current Testnet)

```javascript
const cargoToml = `
[package]
name = "casper_contract"
version = "0.1.0"
edition = "2021"

[dependencies]
casper-contract = "5.0"
casper-types = "6.0"

[profile.release]
lto = true
codegen-units = 1
opt-level = "z"

[lib]
crate-type = ["cdylib"]
`.trim();

// Use nightly-2025-01-01 for edition2024 support
const cmd = `cargo +nightly-2025-01-01 build --release --target wasm32-unknown-unknown`;
```

---

## Common Errors & Solutions

### Error: `feature edition2024 is required`
**Cause:** casper-contract 5.0 dependencies require edition2024
**Solution:** Use `nightly-2025-01-01` or newer

### Error: `found duplicate lang item panic_impl`
**Cause:** Contract defines #[panic_handler] but casper-contract 5.0 already provides one
**Solution:** Remove #[panic_handler] and #[global_allocator] from your code

### Error: `no EntryPoint in the root`
**Cause:** casper-types 6.0 moved EntryPoint to contracts module
**Solution:** Import from `casper_types::contracts::EntryPoint`

### Error: `no variant Contract found for enum EntryPointType`
**Cause:** Renamed in casper-types 6.0
**Solution:** Use `EntryPointType::Called` instead of `EntryPointType::Contract`

### Error: `this function takes 5 arguments but 4 were supplied`
**Cause:** new_contract() in casper-contract 5.0 requires message_topics argument
**Solution:** Add `None` as 5th argument

### Error: `mismatched types ... EntryPoints into casper_types::EntryPoints`
**Cause:** Type conversion required between contracts:: and root types
**Solution:** Add `.into()` to entry_points and named_keys arguments

### Error: `ApiError::EarlyEndOfStream [17]`
**Cause:** Contract runtime error during execution
**Possible causes:**
- Wrong SDK version for network (3.0 code on Casper 2.0 network)
- Calling `new_contract()` or `add_contract_version()` with incompatible API
- Insufficient payment amount for contract installation

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│ CASPER 2.0 CHEAT SHEET                                          │
├─────────────────────────────────────────────────────────────────┤
│ Cargo.toml:                                                     │
│   casper-contract = "5.0"                                       │
│   casper-types = "6.0"                                          │
│   (NO wee_alloc needed)                                         │
├─────────────────────────────────────────────────────────────────┤
│ Imports:                                                        │
│   use casper_types::{                                           │
│       contracts::{EntryPoint, EntryPoints, NamedKeys},          │
│       EntryPointAccess, EntryPointType, CLType, Key, URef,      │
│       ContractPackageHash,  // For upgrades                     │
│   };                                                            │
├─────────────────────────────────────────────────────────────────┤
│ EntryPointType:                                                 │
│   EntryPointType::Called   (was Contract)                       │
├─────────────────────────────────────────────────────────────────┤
│ new_contract (5 args - for V1 fresh deploy):                    │
│   storage::new_contract(                                        │
│       entry_points.into(),                                      │
│       Some(named_keys.into()),                                  │
│       Some(String::from("pkg")),                                │
│       Some(String::from("uref")),                               │
│       None,           ← message_topics                          │
│   );                                                            │
├─────────────────────────────────────────────────────────────────┤
│ add_contract_version (4 args - for V2+ upgrades):               │
│   storage::add_contract_version(                                │
│       package_hash,                                             │
│       entry_points.into(),                                      │
│       named_keys.into(),                                        │
│       Default::default(),  ← message_topics                     │
│   );                                                            │
├─────────────────────────────────────────────────────────────────┤
│ Toolchain: nightly-2025-01-01                                   │
│ Payment: >= 200 CSPR for contract packages                      │
├─────────────────────────────────────────────────────────────────┤
│ DO NOT include:                                                 │
│   - #[panic_handler]                                            │
│   - #[global_allocator]                                         │
│   - wee_alloc dependency                                        │
└─────────────────────────────────────────────────────────────────┘
```

