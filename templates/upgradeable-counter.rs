#![no_std]
#![no_main]

extern crate alloc;

use alloc::string::String;
use alloc::vec;
use casper_contract::contract_api::{runtime, storage};
use casper_contract::unwrap_or_revert::UnwrapOrRevert;
use casper_types::{
    contracts::NamedKeys, CLType, EntryPoint, EntryPointAccess, EntryPointType,
    EntryPoints, Key, URef,
};

#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

const CONTRACT_PACKAGE_NAME: &str = "counter_package";
const CONTRACT_ACCESS_UREF: &str = "counter_access_uref";
const COUNTER_KEY: &str = "counter";
const CONTRACT_VERSION_KEY: &str = "version";

/// Creates entry points for the counter contract
fn get_entry_points() -> EntryPoints {
    let mut entry_points = EntryPoints::new();

    // Increment entry point
    let increment = EntryPoint::new(
        String::from("increment"),
        vec![],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    );
    entry_points.add_entry_point(increment);

    // Get counter value entry point
    let get_count = EntryPoint::new(
        String::from("get_count"),
        vec![],
        CLType::U64,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    );
    entry_points.add_entry_point(get_count);

    entry_points
}

/// Increment the counter
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

/// Get the current counter value
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

/// Install or upgrade the contract
#[no_mangle]
pub extern "C" fn call() {
    // Create initial counter storage
    let counter_uref = storage::new_uref(0u64);
    let counter_key = Key::URef(counter_uref);

    // Create named keys for the contract
    let mut named_keys = NamedKeys::new();
    named_keys.insert(String::from(COUNTER_KEY), counter_key);
    named_keys.insert(
        String::from(CONTRACT_VERSION_KEY),
        storage::new_uref(String::from("1.0.0")).into(),
    );

    // Define entry points
    let entry_points = get_entry_points();

    // Create a new contract package (for upgradeable contracts)
    let (contract_package_hash, _access_uref) = storage::create_contract_package_at_hash();

    // Add the contract version to the package
    let (contract_hash, _contract_version) =
        storage::add_contract_version(contract_package_hash, entry_points, named_keys);

    // Store the contract package hash and access URef for future upgrades
    runtime::put_key(CONTRACT_PACKAGE_NAME, contract_package_hash.into());
    runtime::put_key(CONTRACT_ACCESS_UREF, _access_uref.into());

    // Also store the contract hash for direct calls
    runtime::put_key("counter_contract", contract_hash.into());
}

#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    loop {}
}
