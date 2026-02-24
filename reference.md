Casper Network Hackathon Onboarding Guide
Welcome to the Casper Network Hackathon! This guide will help you quickly get started building decentralized applications on Casper, an enterprise-grade proof-of-stake blockchain designed for real-world use cases.

🚀 Quick Start: 3 Steps to Building on Casper
1. Set Up Your Environment
System Requirements: Linux (Ubuntu 22.04+) or macOS recommended

Install Core Tools:

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add WebAssembly target
rustup target add wasm32-unknown-unknown

# Install Casper CLI tools
cargo install casper-client
cargo install cargo-casper
2. Get Testnet Tokens
Generate keys: casper-client keygen keys/
Visit testnet.cspr.live to request test tokens from the faucet
Use the block explorer to monitor your transactions
The faucet gives 1000 Testnet CSPR per account. If you need more Testnet tokens for your project, please submit a request.
3. Choose Your Development Path
Start building with the user-friendly Odra framework (recommended) or the native Casper Rust SDK for more control. You can also explore quick-start options like the Lottery App demo, CSPR.click & CSPR.cloud, or other available SDKs and starter templates to accelerate your development.

Option A: Odra Framework (Recommended for beginners)

cargo install cargo-odra --locked
cargo odra new --name my-project
cd my-project
cargo odra build
cargo odra test
Option B: Native Casper Rust SDK

Follow the official documentation at docs.casper.network
📚 Essential Resources
Core Documentation
docs.casper.network - Official Casper documentation, developer guides, and API references
docs.cspr.cloud - Cloud services, RPC nodes, and infrastructure tools
odra.dev/docs - Smart contract framework documentation with tutorials
Development Tools
testnet.cspr.live - Block explorer, faucet, and account management
docs.cspr.click - Wallet integration SDK for dApp frontends
🛠️ Your Development Workflow
Step 1: Write Smart Contracts
Casper smart contracts are written in Rust and compiled to WebAssembly (Wasm).

Using Odra Framework:

use odra::prelude::*;

#[odra::module]
pub struct Counter {
    value: Variable<u64>,
}

#[odra::module]
impl Counter {
    pub fn increment(&mut self) {
        let current = self.value.get_or_default();
        self.value.set(current + 1);
    }
    
    pub fn get(&self) -> u64 {
        self.value.get_or_default()
    }
}
Build and Test:

cargo odra build          # Compile to Wasm
cargo odra test           # Test with OdraVM
cargo odra test -b casper # Test with CasperVM
Step 2: Deploy to Testnet
casper-client put-deploy \
  --node-address http://NODE_IP:7777 \
  --chain-name casper-test \
  --secret-key keys/secret_key.pem \
  --payment-amount 100000000000 \
  --session-path target/wasm32-unknown-unknown/release/contract.wasm
Find RPC node addresses at docs.cspr.cloud

Step 3: Build a Frontend with Wallet Integration
Quick Start with React:

npx create-react-app my-dapp --template @make-software/csprclick-react
cd my-dapp
npm start
CSPR.click provides seamless integration with all Casper wallets:

Casper Wallet
Ledger
MetaMask Snap
Wallet Connect
See docs.cspr.click for integration guides.

🔑 Key Concepts
Account Model
Casper uses an account-based model where each account has:

Public Key: Your account identifier
Private Key: Used to sign transactions (keep secure!)
Account Hash: Derived from your public key
Gas & Payment
All transactions require CSPR tokens for gas fees
Payment amount depends on computation complexity
Testnet tokens are free from the faucet
Smart Contract Execution
Contracts are deployed as stored contracts on-chain
Call contracts using entry points (function names)
State is persistent between calls
🧪 Testing & Debugging
Local Testing
# Unit tests with Odra
cargo odra test

# Integration tests with CasperVM
cargo odra test -b casper
Testnet Debugging
Monitor deployments on testnet.cspr.live
Check deploy status: casper-client get-deploy --node-address http://NODE_IP:7777 <DEPLOY_HASH>
View account state: Search your account hash on the block explorer
📖 Learning Resources
Tutorials & Guides
Getting Started: docs.cspr.cloud/getting-started
Writing Smart Contracts: docs.casper.network/developers
Odra Tutorials: odra.dev/docs/tutorials
Example Projects
NFT Contract: https://github.com/casper-ecosystem/cep-78-enhanced-nft/
Fungible Token Contract: https://github.com/casper-ecosystem/cep18
Lottery Demo dApp: https://github.com/casper-ecosystem/lottery-demo-dapp
Buy Me a Coffee dApp: TBD
Community Support
Telegram: Join the Casper Developers Group
Forum: Casper developer forum
Casper Discord: https://discord.com/invite/caspernetwork
Odra Discord for Smart Contract Support: https://discord.gg/Mm5ABc9P8k
🎯 Hackathon Tips
Project Ideas
DeFi: DEX, lending protocols, stablecoins, bridging, interoperability, liquid staking (including project that use contract staking functionality as a (secondary) yield generator for their app's deposited tokens)
NFTs: Marketplaces, gaming assets, digital collectibles
DAOs: Governance systems, treasury management
Enterprise: Supply chain, identity, tokenization
Infrastructure: Developer tools, oracles, bridges
Best Practices
Start Simple: Build a minimal viable product first
Test Thoroughly: Use both OdraVM and Casper NCTL Docker for testing
Document Well: Clear README and code comments
Use Testnet: Deploy early and iterate
Integrate Wallets: Make your dApp user-friendly with CSPR.click
Common Pitfalls to Avoid
Insufficient payment amounts (increase gas if deploys fail)
Not testing locally before deploying
Hardcoding node addresses (use environment variables)
Forgetting to fund testnet accounts
🔗 Quick Reference Links
Resource	Purpose	URL
Official Docs	Core documentation & guides	docs.casper.network
Cloud Services	RPC nodes & infrastructure	docs.cspr.cloud
Odra Framework	Smart contract development	odra.dev/docs
Testnet Explorer	Block explorer & faucet	testnet.cspr.live
Wallet SDK	Frontend integration	docs.cspr.click
✅ Pre-Hackathon Checklist
Install Rust and Casper CLI tools
Generate Casper keys
Get testnet tokens from faucet
Deploy a test contract to testnet
Create an account and auth keys on CSPR.build
Set up a basic frontend with CSPR.click
Join Casper developer community channels
Explore example projects on GitHub
Ready to build? Start with CSPR.click for bootstrapping your project fast, and use CSPR.cloud to interact with the network. Use the Odra framework for the fastest path to deployment of the smart contracts, or dive into native Casper development for maximum flexibility. Good luck, and happy hacking! 🚀

For technical support during the hackathon, reach out on one of the community support channels or check the documentation links above.