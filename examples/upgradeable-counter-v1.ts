// Upgradeable Counter V1 - Casper 2.0 (casper-contract 5.0 + casper-types 6.0)
// With self-initialization entry point following Casper best practices
export const upgradeableCounterV1 = {
    'Cargo.toml': `[package]
name = "upgradeable_counter"
version = "1.0.0"
edition = "2021"

[dependencies]
casper-contract = "5.0"
casper-types = "6.0"

[profile.release]
lto = true
codegen-units = 1
opt-level = "z"

[lib]
crate-type = ["cdylib"]`,

    'src/main.rs': `#![no_std]
#![no_main]

extern crate alloc;

use alloc::string::String;
use alloc::vec;
use casper_contract::contract_api::{runtime, storage};
use casper_contract::unwrap_or_revert::UnwrapOrRevert;
use casper_types::{
    contracts::{EntryPoint, EntryPoints, NamedKeys},
    EntryPointAccess, EntryPointType, CLType, Key, URef, Parameter,
};

const COUNTER_KEY: &str = "counter";
const INITIALIZED_KEY: &str = "initialized";

fn get_entry_points() -> EntryPoints {
    let mut entry_points = EntryPoints::new();

    // Self-initialization entry point (Best Practice)
    // Can only be called once - prevents re-initialization
    entry_points.add_entry_point(EntryPoint::new(
        String::from("init"),
        vec![
            Parameter::new("initial_value", CLType::U64),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        String::from("increment"),
        vec![],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Called,
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

/// Self-initialization entry point
/// Best Practice: Initialize contract state without a subsequent deploy
/// This can only be called once - subsequent calls will revert
#[no_mangle]
pub extern "C" fn init() {
    // Check if already initialized
    if runtime::has_key(INITIALIZED_KEY) {
        runtime::revert(casper_types::ApiError::User(1)); // Already initialized
    }
    
    // Get initial value from args (default to 0)
    let initial_value: u64 = runtime::get_named_arg("initial_value");
    
    // Create the counter with initial value
    let counter_uref = storage::new_uref(initial_value);
    runtime::put_key(COUNTER_KEY, Key::URef(counter_uref));
    
    // Mark as initialized (prevents re-init)
    let init_uref = storage::new_uref(true);
    runtime::put_key(INITIALIZED_KEY, Key::URef(init_uref));
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
    // Initialize counter to 0 by default (can be changed via init entry point)
    let counter_uref = storage::new_uref(0u64);
    let counter_key = Key::URef(counter_uref);
    
    let mut named_keys = NamedKeys::new();
    named_keys.insert(String::from(COUNTER_KEY), counter_key);
    
    let entry_points = get_entry_points();
    
    let (stored_contract_hash, _) = storage::new_contract(
        entry_points.into(),
        Some(named_keys.into()),
        Some(String::from("counter_package")),
        Some(String::from("counter_access_uref")),
        None,
    );
    
    runtime::put_key("counter_contract", stored_contract_hash.into());
}`,

    'README.md': `# Upgradeable Counter V1 - Casper 2.0

## Best Practices Included

### Self-Initialization Entry Point
This contract includes an \`init()\` entry point following Casper best practices:

- **init(initial_value: U64)**: Initialize counter with a custom value
  - Can only be called once (prevents re-initialization)
  - Reduces gas by avoiding subsequent deploy

### Entry Points
- \`init(initial_value)\` - Initialize with custom value (one-time only)
- \`increment()\` - Increment counter by 1
- \`get_count()\` - Get current counter value

### Optimizations Applied
- \`#![no_std]\` - No standard library for smaller Wasm
- \`lto = true\` - Link-time optimization
- \`codegen-units = 1\` - Single codegen unit for better optimization
- \`opt-level = "z"\` - Optimize for size
`
};
