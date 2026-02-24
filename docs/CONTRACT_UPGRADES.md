# Contract Upgrades on Casper

Complete guide to deploying and upgrading smart contracts using Casper's Contract Package system.

---

## Table of Contents

1. [Understanding Contract Packages](#understanding-contract-packages)
2. [Writing Upgradeable Contracts (V1)](#writing-upgradeable-contracts-v1)
3. [Deploying Upgrade Versions (V2+)](#deploying-upgrade-versions-v2)
4. [Managing Access URefs](#managing-access-urefs)
5. [State Migration Strategies](#state-migration-strategies)
6. [Testing Upgrades](#testing-upgrades)
7. [Security Best Practices](#security-best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Understanding Contract Packages

### What is a Contract Package?

A **Contract Package** is like a folder that contains multiple versions of a contract. When you upgrade a contract on Casper, you don't replace the old code—you add a new version alongside it.

```
Contract Package (hash-abc123...)
├── Version 1 (contract-hash-v1...)
│   ├── Entry Points: increment, get_count
│   └── State: counter = 5
├── Version 2 (contract-hash-v2...) ← Latest/Active
│   ├── Entry Points: increment, get_count, decrement, reset
│   └── State: counter = 5 (inherited from V1!)
└── Access URef (uref-xyz789...) ← Your upgrade key!
```

###Key Concepts

#### Contract Package Hash
- **What it is:** Unique identifier for the package
- **Purpose:** References the package for upgrades
- **Format:** `contract-package-wasm...` (64 char hex)
- **Saved in:** Account's named keys

#### Access URef
- **What it is:** Unforgeable reference (permission token)
- **Purpose:** Proves you own the contract and can upgrade it
- **Analogy:** Like a private key for contract upgrades
- **Critical:** Without it, the contract is **locked forever**

#### Contract Version
- **What it is:** Sequential number (1, 2, 3, ...)
- **Active version:** The current version receiving calls
- **Old versions:** Still exist, can be re-enabled if needed

---

## Writing Upgradeable Contracts (V1)

### The Critical Difference

**Non-Upgradeable (Simple) Contract:**
```rust
#[no_mangle]
pub extern "C" fn call() {
    // Creates a standalone contract
    let (contract_hash, _version) = storage::new_contract(
        entry_points,
        Some(named_keys),
        Some("my_contract"),
        Some("my_contract_access") // ⚠️ Version 1.x only
    );
}
```

**Upgradeable Contract:**
```rust
#[no_mangle]
pub extern "C" fn call() {
    // Step 1: Create package and get Access URef
    let (package_hash, access_uref) = storage::create_contract_package_at_hash();
    
    // Step 2: Add Version 1 to the package
    let (contract_hash, version) = storage::add_contract_version(
        package_hash,
        entry_points,
        named_keys
    );
    
    // Step 3: Save package hash and Access URef (CRITICAL!)
    runtime::put_key("my_package", package_hash.into());
    runtime::put_key("my_package_access", access_uref.into());
}
```

### Full V1 Example

```rust
#![no_std]
#![no_main]

extern crate alloc;
use alloc::string::String;
use alloc::vec;
use casper_contract::contract_api::{runtime, storage};
use casper_types::{
    contracts::NamedKeys, CLType, EntryPoint, EntryPointAccess,
    EntryPointType, EntryPoints, Key, URef,
};

const PACKAGE_NAME: &str = "counter_package";
const ACCESS_UREF_NAME: &str = "counter_access_uref";
const COUNTER_KEY: &str = "counter";

fn get_entry_points() -> EntryPoints {
    let mut entry_points = EntryPoints::new();
    
    entry_points.add_entry_point(EntryPoint::new(
        String::from("increment"),
        vec![],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
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
        .unwrap_or(0);
    
    storage::write(counter_uref, current + 1);
}

#[no_mangle]
pub extern "C" fn call() {
    // Initialize state
    let counter_uref = storage::new_uref(0u64);
    let mut named_keys = NamedKeys::new();
    named_keys.insert(String::from(COUNTER_KEY), Key::URef(counter_uref));
    
    // Create upgradeable package
    let (package_hash, access_uref) = storage::create_contract_package_at_hash();
    
    // Add V1
    let (contract_hash, _version) = storage::add_contract_version(
        package_hash,
        get_entry_points(),
        named_keys
    );
    
    // ⭐ CRITICAL: Save package hash and Access URef
    runtime::put_key(PACKAGE_NAME, package_hash.into());
    runtime::put_key(ACCESS_UREF_NAME, access_uref.into());
    runtime::put_key("counter_contract", contract_hash.into());
}
```

### V1 Deployment Checklist

- [ ] Use `storage::create_contract_package_at_hash()`
- [ ] Save Access URef to account named keys
- [ ] Save package hash to account named keys
- [ ] Document package name conventions
- [ ] Test entry points after deployment
- [ ] **Back up Access URef** immediately

---

## Deploying Upgrade Versions (V2+)

### The Upgrade Pattern

V2 deployment is fundamentally different from V1:

**Key Differences:**
- ❌ Does NOT create a new package
- ✅ Adds version to EXISTING package
- ❌ Does NOT need `create_contract_package_at_hash()`
- ✅ Requires Access URef from V1

### Full V2 Example

```rust
#![no_std]
#![no_main]

extern crate alloc;
use alloc::string::String;
use alloc::vec;
use casper_contract::contract_api::{runtime, storage};
use casper_contract::unwrap_or_revert::UnwrapOrRevert;
use casper_types::{
    api_error, contracts::NamedKeys, ApiError, CLType,
    ContractPackageHash, EntryPoint, EntryPointAccess,
    EntryPointType, EntryPoints, Key, URef,
};

const PACKAGE_NAME: &str = "counter_package";
const ACCESS_UREF_NAME: &str = "counter_access_uref";
const COUNTER_KEY: &str = "counter";

fn get_entry_points() -> EntryPoints {
    let mut entry_points = EntryPoints::new();
    
    // Keep existing entry points
    entry_points.add_entry_point(EntryPoint::new(
        String::from("increment"),
        vec![],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));
    
    // Add new entry point in V2
    entry_points.add_entry_point(EntryPoint::new(
        String::from("decrement"),
        vec![],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));
    
    entry_points
}

#[no_mangle]
pub extern "C" fn increment() { /* same as V1 */ }

#[no_mangle]
pub extern "C" fn decrement() {
    let counter_uref: URef = runtime::get_key(COUNTER_KEY)
        .and_then(|key| key.into_uref())
        .unwrap_or_revert();
    
    let current: u64 = storage::read(counter_uref)
        .unwrap_or_revert()
        .unwrap_or(0);
    
    if current > 0 {
        storage::write(counter_uref, current - 1);
    }
}

#[no_mangle]
pub extern "C" fn call() {
    // Step 1: Retrieve Access URef (proves ownership)
    let access_uref: URef = runtime::get_key(ACCESS_UREF_NAME)
        .unwrap_or_revert_with(ApiError::User(100)) // "Access URef not found"
        .into_uref()
        .unwrap_or_revert_with(ApiError::User(101)); // "Invalid URef"
    
    // Step 2: Get package hash
    let package_hash: ContractPackageHash = runtime::get_key(PACKAGE_NAME)
        .unwrap_or_revert_with(ApiError::User(102)) // "Package not found"
        .into_hash()
        .map(ContractPackageHash::new)
        .unwrap_or_revert_with(ApiError::User(103)); // "Invalid hash"
    
    // Step 3: Get existing state (persists across upgrades!)
    let counter_key = runtime::get_key(COUNTER_KEY)
        .unwrap_or_revert_with(ApiError::User(104));
    
    let mut named_keys = NamedKeys::new();
    named_keys.insert(String::from(COUNTER_KEY), counter_key);
    
    // Step 4: Add V2 to existing package
    let (contract_hash, version) = storage::add_contract_version(
        package_hash,
        get_entry_points(),
        named_keys
    );
    
    // Optional: Update contract hash reference
    runtime::put_key("counter_contract", contract_hash.into());
}
```

### Upgrade Deployment Checklist

- [ ] Retrieve Access URef from named keys
- [ ] Retrieve package hash from named keys
- [ ] Use `storage::add_contract_version()` (NOT `create_contract_package_at_hash()`)
- [ ] Handle existing state carefully
- [ ] Add error codes for debugging
- [ ] Test upgrade on testnet first
- [ ] Verify version number increased

---

## Managing Access URefs

### What Can Go Wrong

> [!CAUTION]
> **Losing the Access URef = Permanently Frozen Contract**
>
> If you lose or delete the Access URef:
> - ✅ The contract continues to work
> - ❌ You can NEVER deploy upgrades
> - ❌ No way to recover (it's cryptographically impossible)
> - ❌ Contract is frozen at current version forever

### Best Practices

#### 1. Immediate Backup After V1 Deployment

**After deploying V1:**
```bash
# Query your account on block explorer
https://testnet.cspr.live/account/<your-account-hash>

# Look for named keys:
# - "counter_package" → save this!
# - "counter_access_uref" → BACK THIS UP NOW!
```

**In CasperIDE:**
- Check browser Console for deployment logs
- Copy package hash and Access URef
- Store in password manager or secure notes
- Consider exporting to encrypted file

#### 2. Local Storage Management

**CasperIDE automatically saves:**
```json
// localStorage: "caspier-deployed-contracts"
{
  "id": "123",
  "packageHash": "contract-package-wasm...",
  "accessURef": "uref-abc123...",
  "versions": [1, 2],
  "network": "testnet"
}
```

**Export your contracts:**
1. Open DevTools → Application → Local Storage
2. Find `caspier-deployed-contracts`
3. Copy JSON value
4. Save to secure file: `my-contracts-backup.json`

#### 3. Multi-Signature Solutions (Production)

For production contracts, consider:
- **Shared Access URefs:** Multiple accounts hold copies
- **Multi-sig wallets:** Require multiple approvals for upgrades
- **DAO governance:** Community votes on upgrades
- **Timelock contracts:** Delay upgrades for review period

#### 4. Access URef Rotation (Advanced)

You can update who holds the Access URef:
```rust
// In an upgrade, transfer Access URef to new account
let new_owner_key: Key = runtime::get_named_arg("new_owner");
runtime::put_key("counter_access_uref", new_owner_key);
```

**Use cases:**
- Transferring contract ownership
- Implementing multi-sig
- Revoking compromised keys

---

## State Migration Strategies

### State Persists Across Upgrades

**Critical concept:** URefs in named keys **persist automatically**.

```rust
// V1 creates:
let counter_uref = storage::new_uref(42u64);
named_keys.insert("counter", Key::URef(counter_uref));

// V2 retrieves the SAME URef:
let counter_key = runtime::get_key("counter"); // Still points to same data!
let value: u64 = storage::read(counter_uref); // value = 42
```

### Migration Patterns

#### Pattern 1: Add New State

```rust
// V2 adds new state without touching V1 state
#[no_mangle]
pub extern "C" fn call() {
    // Get existing state
    let counter_key = runtime::get_key("counter").unwrap_or_revert();
    
    // Add new state
    let multiplier_uref = storage::new_uref(2u64);
    
    let mut named_keys = NamedKeys::new();
    named_keys.insert(String::from("counter"), counter_key);
    named_keys.insert(String::from("multiplier"), Key::URef(multiplier_uref));
    
    storage::add_contract_version(package_hash, entry_points, named_keys);
}
```

#### Pattern 2: Transform Existing State

```rust
// V2 changes data structure
#[no_mangle]
pub extern "C" fn call() {
    // Read old format
    let old_counter: u64 = storage::read(old_uref).unwrap_or_revert();
    
    // Create new format
    let new_counter = CounterV2 {
        value: old_counter,
        last_updated: runtime::get_blocktime(),
    };
    let new_uref = storage::new_uref(new_counter);
    
    // Update named keys
    named_keys.insert("counter_v2", Key::URef(new_uref));
    // Keep old key for backward compatibility if needed
}
```

#### Pattern 3: Schema Versioning

```rust
// Track schema version
const SCHEMA_VERSION: &str = "schema_version";

#[no_mangle]
pub extern "C" fn call() {
    let current_version: u32 = runtime::get_key(SCHEMA_VERSION)
        .and_then(|key| key.into_uref())
        .and_then(|uref| storage::read(uref).ok())
        .flatten()
        .unwrap_or(0);
    
    // Migrate from V1 to V2 schema
    if current_version < 2 {
        migrate_v1_to_v2();
    }
    
    // Update schema version
    let version_uref = storage::new_uref(2u32);
    named_keys.insert(String::from(SCHEMA_VERSION), Key::URef(version_uref));
}
```

### Migration Risks

> [!WARNING]
> **Breaking Changes**
> - Removing named keys can break external integrations
> - Changing entry point signatures breaks callers
> - Deleting state can cause data loss
>
> **Always:**
> - Test migrations on testnet first
> - Provide migration period for clients
> - Document breaking changes clearly
> - Consider deprecation instead of deletion

---

## Testing Upgrades

### Local Testing (Recommended)

**Use CasperIDE + Testnet:**

1. **Deploy V1:**
   - Load "Upgradeable Counter V1" template
   - Test on Casper Testnet
   - Note package hash and Access URef
   - Verify entry points work

2. **Verify V1 State:**
   - Call `increment` several times
   - Call `get_count` → should return incremented value
   - Check state on block explorer

3. **Deploy V2:**
   - Load "Upgradeable Counter V2" template
   - Use "Upgrade Contract" mode
   - Enter package hash from V1
   - Deploy and verify

4. **Verify Upgrade:**
   - Old entry points still work (`increment`, `get_count`)
   - New entry points available (`decrement`, `reset`)
   - State preserved (count matches pre-upgrade value)
   - Version number increased

### Integration Testing Pattern

```rust
// tests/integration_tests.rs
#[cfg(test)]
mod tests {
    use casper_engine_test_support::{TestContext, TestContextBuilder};
    
    #[test]
    fn test_upgrade_preserves_state() {
        let mut context = TestContextBuilder::new().build();
        
        // Deploy V1
        let v1_session = execute_installer(&mut context, "v1.wasm");
        let package_hash = get_package_hash(&context);
        
        // Set initial state
        call_contract(&mut context, "increment"); // count = 1
        assert_eq!(get_count(&context), 1);
        
        // Deploy V2
        deploy_upgrade(&mut context, "v2.wasm", package_hash);
        
        // Verify state persisted
        assert_eq!(get_count(&context), 1); // Still 1!
        
        // Test new functionality
        call_contract(&mut context, "decrement");
        assert_eq!(get_count(&context), 0);
    }
}
```

---

## Security Best Practices

### 1. Access Control

**Secure your Access URef:**
```rust
// ❌ BAD: Exposing Access URef publicly
runtime::put_key("public_access", access_uref.into());

// ✅ GOOD: Store privately in account named keys
runtime::put_key("my_private_access", access_uref.into());
```

### 2. Upgrade Authorization

**Add owner checks:**
```rust
#[no_mangle]
pub extern "C" fn call() {
    // Verify caller is authorized
    let caller = runtime::get_caller();
    let owner: AccountHash = runtime::get_named_arg("owner");
    
    if caller != owner.into() {
        runtime::revert(ApiError::User(999)); // Unauthorized
    }
    
    // Proceed with upgrade...
}
```

### 3. Upgrade Governance

**For production contracts:**
- Implement timelock (upgrades take effect after delay)
- Require multiple signatures
- Allow community veto period
- Emit upgrade events for monitoring

### 4. Emergency Pause

```rust
const PAUSED_KEY: &str = "paused";

#[no_mangle]
pub extern "C" fn pause() {
    // Only owner can pause
    verify_owner();
    storage::write(get_paused_uref(), true);
}

#[no_mangle]
pub extern "C" fn unpause() {
    verify_owner();
    storage::write(get_paused_uref(), false);
}

fn check_not_paused() {
    let paused: bool = storage::read(get_paused_uref())
        .unwrap_or_revert()
        .unwrap_or(false);
    
    if paused {
        runtime::revert(ApiError::User(888)); // Contract paused
    }
}
```

---

## Troubleshooting

### Common Errors

#### Error: `ApiError::User(1)` - Access URef Not Found

**Cause:** Access URef not in account named keys

**Solutions:**
1. Did you deploy V1 from this account? Check account on block explorer
2. Was Access URef saved? Review V1 deployment code
3. Using correct account? Ensure same wallet as V1 deployment

#### Error: `ApiError::User(3)` - Package Not Found

**Cause:** Package hash not in account named keys

**Solutions:**
1. Verify package hash on block explorer
2. Check named key matches V1: `counter_package`
3. Ensure V1 deployment succeeded

#### Error: Contract Has Wrong Entry Points After Upgrade

**Diagnosis:**
- Query contract package on block explorer
- Check "Active Version" number
- List all entry points

**Possible causes:**
1. Upgrade deploy failed silently
2. Old version still active
3. Calling old contract hash instead of package hash

**Fix:**
```bash
# Always call via package hash, not contract hash
casper-client put-deploy \
  --session-package-hash "$PACKAGE_HASH" \
  --session-entry-point "decrement"
```

#### Error: State Lost After Upgrade

**Causes:**
1. Created new URef instead of reusing existing
2. Removed named key from V2
3. State was in contract storage, not account storage

**Prevention:**
```rust
// ❌ BAD: Creates new state
let counter_uref = storage::new_uref(0u64);

// ✅ GOOD: Reuse existing state
let counter_key = runtime::get_key("counter").unwrap_or_revert();
```

### Debugging Tips

**1. Check Named Keys:**
```bash
# On block explorer
https://testnet.cspr.live/account/<account-hash>

# Look for:
# - Package hash
# - Access URef
# - Contract hash
```

**2. Query Package Versions:**
```bash
casper-client get-state-root-hash --node-address http://...
casper-client query-global-state \
  --state-root-hash "$STATE_ROOT" \
  --key "hash-abc123..." # Package hash
```

**3. Enable Detailed Logging:**
```rust
// Add debug info to upgrades
runtime::put_key("upgrade_log", storage::new_uref(
    format!("Upgraded to V{} at {}", version, runtime::get_blocktime())
).into());
```

---

## Next Steps

**You're ready to upgrade contracts!**

1. ✅ Load ["Upgradeable Counter V1"](file:///C:/Users/jayas/Videos/SIS/CasperIDE/IDE/examples/upgradeable-counter-v1.ts) in CasperIDE
2. ✅ Deploy to testnet and save Access URef
3. ✅ Load ["Upgradeable Counter V2"](file:///C:/Users/jayas/Videos/SIS/CasperIDE/IDE/examples/upgradeable-counter-v2.ts)
4. ✅ Deploy upgrade and verify new features

**Additional Resources:**
- [WASM Compilation & Deployment Guide](file:///C:/Users/jayas/Videos/SIS/CasperIDE/IDE/docs/WASM_COMPILATION_AND_DEPLOYMENT.md)
- [Casper Contract Versioning Tutorial](https://docs.casper.network/developers/writing-onchain-code/upgrading-contracts/)
- [Example Upgradeable Contracts](https://github.com/casper-ecosystem/counter)
