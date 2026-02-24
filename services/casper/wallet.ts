import { CasperClient, CLPublicKey, DeployUtil } from 'casper-js-sdk';
import { WalletConnection } from '../../types';

/**
 * Wallet Connection Service
 * Handles connections to Casper wallets
 */
export class WalletService {
  /**
   * Check if Casper Wallet extension is available
   */
  static isCasperWalletAvailable(): boolean {
    if (typeof window === 'undefined') return false;

    const casperWallet = (window as any).casperWallet;
    const casperlabsHelper = (window as any).casperlabsHelper;
    const signerHelper = (window as any).signerHelper;

    return !!(casperWallet || casperlabsHelper || signerHelper);
  }

  /**
   * Get available wallet types
   */
  static getAvailableWallets(): string[] {
    if (typeof window === 'undefined') return [];

    const available: string[] = [];
    const casperWallet = (window as any).casperWallet;
    const casperlabsHelper = (window as any).casperlabsHelper;
    const signerHelper = (window as any).signerHelper;

    if (casperWallet) available.push('Casper Wallet');
    if (casperlabsHelper) available.push('Casper Labs Helper (Legacy)');
    if (signerHelper) available.push('Signer Helper');

    return available;
  }

  /**
   * Connect to Casper Wallet extension
   */
  static async connectCasperWallet(): Promise<WalletConnection> {
    try {
      if (typeof window === 'undefined') {
        throw new Error('Window object not available');
      }

      // Retry mechanism to wait for extension injection
      const waitForInjection = async (retries = 10, delay = 200): Promise<any> => {
        for (let i = 0; i < retries; i++) {
          const cw = (window as any).casperWallet;
          if (cw) return cw;
          await new Promise(r => setTimeout(r, delay));
        }
        return null;
      };

      // Wait for wallet to inject
      const casperWallet = await waitForInjection();

      const casperlabsHelper = (window as any).casperlabsHelper;
      const signerHelper = (window as any).signerHelper;

      console.log('Wallet detection result:', {
        casperWallet: !!casperWallet,
        casperlabsHelper: !!casperlabsHelper,
        signerHelper: !!signerHelper
      });

      let publicKey: string | null = null;

      // Try Casper Wallet (Latest Standard)
      if (casperWallet) {
        try {
          // Check if already connected
          const isConnected = await casperWallet.isConnected();
          if (isConnected) {
            try {
              publicKey = await casperWallet.getActivePublicKey();
            } catch (err) {
              // If failed (likely locked), request connection to prompt unlock
              console.log('Wallet connected but locked, requesting connection...');
              publicKey = await casperWallet.requestConnection();
            }
          } else {
            // Request new connection
            publicKey = await casperWallet.requestConnection();
          }
        } catch (e: any) {
          console.warn('Casper Wallet connection error:', e);
          if (e.message?.includes('User rejected')) {
            throw new Error('Connection rejected by user');
          }
        }
      }

      // Fallback: Legacy Casper Labs Helper
      if (!publicKey && casperlabsHelper) {
        try {
          if (typeof casperlabsHelper.requestConnection === 'function') {
            publicKey = await casperlabsHelper.requestConnection();
          } else if (typeof casperlabsHelper.getActivePublicKey === 'function') {
            publicKey = await casperlabsHelper.getActivePublicKey();
          }
        } catch (e) { console.warn("Legacy helper failed", e); }
      }

      if (!publicKey && signerHelper) {
        try {
          publicKey = await signerHelper.getActivePublicKey();
        } catch (e) { console.warn("Signer helper failed", e); }
      }

      if (!publicKey) {
        throw new Error('Casper Wallet not detected. Try refreshing the page if you have the extension installed.');
      }

      return {
        type: 'casper-wallet',
        publicKey,
        address: publicKey,
        connected: true
      };

    } catch (error: any) {
      throw new Error(`Failed to connect wallet: ${error.message}`);
    }
  }

  /**
   * Connect to Casper Signer (deprecated, but kept for compatibility)
   */
  static async connectCasperSigner(): Promise<WalletConnection> {
    try {
      if (typeof window === 'undefined') {
        throw new Error('Window object not available');
      }

      // Casper Signer API (deprecated)
      const signerHelper = (window as any).signerHelper;
      const casperSigner = (window as any).casperSigner;

      let publicKey: string | null = null;

      if (signerHelper) {
        try {
          if (typeof signerHelper.getActivePublicKey === 'function') {
            publicKey = await signerHelper.getActivePublicKey();
          }
          if (!publicKey && typeof signerHelper.requestConnection === 'function') {
            publicKey = await signerHelper.requestConnection();
          }
        } catch (e: any) {
          console.warn('Signer helper connection failed:', e);
          if (e.message && (e.message.includes('reject') || e.message.includes('denied'))) {
            throw new Error('Connection rejected by user');
          }
        }
      }

      if (!publicKey && casperSigner) {
        try {
          if (typeof casperSigner.connect === 'function') {
            publicKey = await casperSigner.connect();
          } else if (typeof casperSigner.getActivePublicKey === 'function') {
            publicKey = await casperSigner.getActivePublicKey();
          }
        } catch (e: any) {
          console.warn('Casper Signer connection failed:', e);
          if (e.message && (e.message.includes('reject') || e.message.includes('denied'))) {
            throw new Error('Connection rejected by user');
          }
        }
      }

      if (!publicKey) {
        throw new Error('Casper Signer not found. Note: Casper Signer has been deprecated. Please use Casper Wallet instead.');
      }

      // Validate public key format
      if (!/^[0-9a-fA-F]+$/.test(publicKey)) {
        throw new Error('Invalid public key format received from wallet');
      }

      return {
        type: 'casper-signer',
        publicKey,
        address: publicKey,
        connected: true
      };
    } catch (error: any) {
      throw new Error(`Failed to connect Casper Signer: ${error.message}`);
    }
  }

  /**
   * Connect with manual public key entry (fallback)
   */
  static connectWithPublicKey(publicKey: string): WalletConnection {
    // Validate public key format
    if (!publicKey || !/^[0-9a-fA-F]+$/.test(publicKey)) {
      throw new Error('Invalid public key format. Public key must be a hexadecimal string.');
    }

    return {
      type: 'casper-wallet', // Treat as casper-wallet for compatibility
      publicKey,
      address: publicKey,
      connected: true
    };
  }

  /**
   * Connect to Ledger device
   */
  static async connectLedger(): Promise<WalletConnection> {
    try {
      // Ledger connection requires WebUSB API
      if (!navigator.usb) {
        throw new Error('WebUSB API not available. Please use a supported browser.');
      }

      // This would require the Casper Ledger app and proper USB connection
      // Placeholder implementation
      throw new Error('Ledger connection not yet implemented. Please use Casper Wallet or Casper Signer.');
    } catch (error: any) {
      throw new Error(`Failed to connect Ledger: ${error.message}`);
    }
  }

  /**
   * Disconnect wallet
   */
  static disconnect(): WalletConnection {
    return {
      type: 'none',
      connected: false
    };
  }

  /**
   * Sign a deploy (DeployUtil.Deploy object)
   */
  static async signDeploy(deploy: any, wallet: WalletConnection): Promise<any> {
    try {
      if (!wallet.connected || !wallet.publicKey) {
        throw new Error('Wallet not connected');
      }

      if (typeof window === 'undefined') {
        throw new Error('Window object not available');
      }

      const { CLPublicKey } = await import('casper-js-sdk');
      const publicKeyObj = CLPublicKey.fromHex(wallet.publicKey);

      if (wallet.type === 'casper-wallet') {
        const casperWallet = (window as any).casperWallet;
        const casperlabsHelper = (window as any).casperlabsHelper;

        if (casperWallet && casperWallet.sign) {
          // New Casper Wallet API
          const signed = await casperWallet.sign(JSON.stringify(deploy), wallet.publicKey);
          return signed;
        } else if (casperlabsHelper && casperlabsHelper.sign) {
          // Legacy API
          const deployHash = deploy.hash;
          const signature = await casperlabsHelper.sign(deployHash, wallet.publicKey);
          return DeployUtil.setSignature(deploy, signature, publicKeyObj);
        } else {
          throw new Error('Casper Wallet signing API not available');
        }
      } else if (wallet.type === 'casper-signer') {
        const signerHelper = (window as any).signerHelper;
        const casperSigner = (window as any).casperSigner;

        if (signerHelper && signerHelper.sign) {
          const signed = await signerHelper.sign(JSON.stringify(deploy), wallet.publicKey);
          return signed;
        } else if (casperSigner && casperSigner.sign) {
          const deployHash = deploy.hash;
          const signature = await casperSigner.sign(deployHash, wallet.publicKey);
          return DeployUtil.setSignature(deploy, signature, publicKeyObj);
        } else {
          throw new Error('Casper Signer signing API not available');
        }
      } else {
        throw new Error('Unsupported wallet type for signing');
      }
    } catch (error: any) {
      throw new Error(`Failed to sign deploy: ${error.message}`);
    }
  }

  /**
   * Get account balance
   */
  static async getBalance(publicKey: string, network: string = 'testnet'): Promise<number> {
    try {
      const networks = {
        testnet: 'https://node-clarity-testnet.make.services/rpc',
        mainnet: 'https://node-clarity-mainnet.make.services/rpc',
        nctl: 'http://localhost:11101/rpc',
        local: 'http://localhost:7777/rpc'
      };

      const client = new CasperClient(networks[network as keyof typeof networks] || networks.testnet);
      const publicKeyObj = CLPublicKey.fromHex(publicKey);
      const balance = await client.balanceOfByPublicKey(publicKeyObj);

      return balance.toNumber();
    } catch (error: any) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }
}



