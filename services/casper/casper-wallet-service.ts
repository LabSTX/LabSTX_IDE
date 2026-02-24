import { WalletConnection } from '../../types';

// Define the Casper Wallet extension interface
interface CasperWalletProvider {
    requestConnection: () => Promise<boolean>;
    requestSwitchAccount: () => Promise<boolean>;
    isConnected: () => Promise<boolean>;
    getActivePublicKey: () => Promise<string | undefined>;
    sign: (deployJson: string, publicKey: string) => Promise<{ cancelled: boolean; signature?: Uint8Array; message?: string }>;
    disconnectFromSite: () => Promise<boolean>;
}

declare global {
    interface Window {
        CasperWalletProvider?: () => CasperWalletProvider;
        CasperWalletEventTypes?: {
            Connected: string;
            Disconnected: string;
            ActiveKeyChanged: string;
            Locked: string;
            Unlocked: string;
        };
    }
}

export class CasperWalletService {

    static isInstalled(): boolean {
        return typeof window !== 'undefined' && !!window.CasperWalletProvider;
    }

    private static getProvider(): CasperWalletProvider | null {
        if (this.isInstalled()) {
            return window.CasperWalletProvider!();
        }
        return null;
    }

    static async waitForInjection(timeoutMs = 5000): Promise<boolean> {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if (this.isInstalled()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        return false;
    }

    static async connect(): Promise<WalletConnection> {
        const provider = this.getProvider();

        if (!provider) {
            const injected = await this.waitForInjection(2000);
            if (!injected) {
                throw new Error('Casper Wallet extension not detected. Please install it.');
            }
            return this.connect();
        }

        try {
            const isConnected = await provider.isConnected();

            if (isConnected) {
                try {
                    const activeKey = await provider.getActivePublicKey();
                    if (!activeKey) {
                        console.log('Wallet connected but locked (no key). Requesting connection to unlock...');
                        await provider.requestConnection();
                    }
                } catch (e) {
                    console.log('Error getting key despite connected status. Requesting connection to unlock...');
                    await provider.requestConnection();
                }
            } else {
                await provider.requestConnection();
            }

            const activeKey = await provider.getActivePublicKey();

            if (!activeKey) {
                throw new Error('Wallet is locked or no account is active. Please unlock your Casper Wallet extension.');
            }

            return {
                type: 'casper-wallet',
                publicKey: activeKey,
                address: activeKey,
                connected: true
            };
        } catch (error: any) {
            console.error('Casper Wallet connection error:', error);
            throw error;
        }
    }

    static async disconnect(): Promise<void> {
        const provider = this.getProvider();
        if (provider) {
            await provider.disconnectFromSite();
        }
    }

    static async signDeploy(deploy: any, wallet: WalletConnection): Promise<any> {
        const provider = this.getProvider();
        if (!provider) {
            throw new Error('Casper Wallet provider not available');
        }

        try {
            const { DeployUtil, CLPublicKey } = await import('casper-js-sdk');

            const deployJsonObj = DeployUtil.deployToJson(deploy);

            console.log('Preparing to sign deploy:', deployJsonObj);

            // Casper 2.0 Compatibility Fix:
            // The wallet may expect the deploy object to be wrapped in a "deploy" key
            // especially if using a legacy Client with a newer Wallet/Node.
            let deployJsonString: string;

            if (!deployJsonObj.deploy) {
                console.log('Wrapping deploy object for Casper 2.0 compatibility...');
                deployJsonString = JSON.stringify({ deploy: deployJsonObj });
            } else {
                deployJsonString = JSON.stringify(deployJsonObj);
            }

            console.log('Sending to wallet for signing...');
            const response = await provider.sign(deployJsonString, wallet.publicKey);

            console.log('Wallet response:', response);

            if (response.cancelled) {
                throw new Error('User cancelled signing');
            }

            if (response.message) {
                throw new Error(`Signing failed: ${response.message}`);
            }

            if (!response.signature) {
                throw new Error('No signature returned from wallet');
            }

            const publicKey = CLPublicKey.fromHex(wallet.publicKey);
            const signature = response.signature;
            const signedDeploy = DeployUtil.setSignature(deploy, signature, publicKey);
            return signedDeploy;

        } catch (error: any) {
            console.error('Signing error:', error);
            throw error;
        }
    }

    static async getBalance(publicKey: string, network: string = 'testnet'): Promise<number> {
        const { CasperClient, CLPublicKey } = await import('casper-js-sdk');

        const testnetNodes = [
            '/casper-rpc',
            '/casper-node-rpc',
            'http://159.65.203.12:7777/rpc'
        ];

        const mainnetNodes = [
            'https://node-clarity-mainnet.make.services/rpc',
            'https://rpc.mainnet.casperlabs.io/rpc'
        ];

        const nodes = network === 'mainnet' ? mainnetNodes : testnetNodes;

        for (const nodeUrl of nodes) {
            try {
                const client = new CasperClient(nodeUrl);
                const publicKeyObj = CLPublicKey.fromHex(publicKey);
                const balance = await client.balanceOfByPublicKey(publicKeyObj);
                return balance.toNumber();
            } catch (e) {
                console.warn(`Failed to fetch balance from ${nodeUrl}`);
            }
        }

        return 0;
    }
}
