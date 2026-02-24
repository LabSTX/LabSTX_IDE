// Simple Counter Contract (Rust) - No Arguments Required
// Updated for Casper 2.0 (casper-contract 5.0)
export const helloWorldRustExample = {
    'Cargo.toml': `[package]
name = "simple_counter"
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
crate-type = ["cdylib"]`,

    'src/main.rs': `#![no_std]
#![no_main]

// Note: casper-contract 5.0 provides panic handler and allocator
// DO NOT include #[panic_handler] or #[global_allocator]

extern crate alloc;

use casper_contract::contract_api::{runtime, storage};
use casper_types::Key;

const COUNTER_KEY: &str = "counter";

#[no_mangle]
pub extern "C" fn call() {
    // Initialize counter to 0
    let counter: u64 = 0;
    
    // Store the counter in the account's named keys
    let counter_uref = storage::new_uref(counter);
    let counter_key = Key::URef(counter_uref);
    
    // Save the key under the name "counter"
    runtime::put_key(COUNTER_KEY, counter_key);
}`
};
