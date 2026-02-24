import { CasperClient, DeployUtil, CLValueBuilder, CLPublicKey, RuntimeArgs } from 'casper-js-sdk';
import { DeployConfig, WalletConnection } from '../../types';

/**
 * Casper Deployment Service
 * Handles contract deployment to Casper network
 */
export class CasperDeploymentService {
  // RPC proxy endpoint - handled by Vite middleware in dev, Vercel serverless in prod
  private static readonly RPC_PROXY = '/api/rpc';

  private static readonly NETWORKS = {
    testnet: 'https://node-clarity-testnet.make.services/rpc',
    mainnet: 'https://node-clarity-mainnet.make.services/rpc',
    nctl: 'http://localhost:11101/rpc',
    local: 'http://localhost:7777/rpc'
  };

  /**
   * Deploy a contract to Casper network
   */
  static async deploy(
    wasmBytes: Uint8Array,
    wallet: WalletConnection,
    config: DeployConfig
  ): Promise<{ deployHash: string; contractHash?: string }> {
    try {
      if (!wallet.connected || !wallet.publicKey) {
        throw new Error('Wallet not connected');
      }

      // Use RPC proxy (auto-detects environment)
      const testnetNodes = [
        this.RPC_PROXY  // Auto-detects /api/rpc (Vercel) or localhost:3001/rpc (local)
      ];

      const mainnetNodes = [
        this.RPC_PROXY  // Can handle mainnet too
      ];

      const targetNetwork = config.chainName === 'casper' ? 'mainnet' : 'testnet';
      const nodes = targetNetwork === 'mainnet' ? mainnetNodes : testnetNodes;

      // Construct deploy params using the primary node for now (DeployParams doesn't depend on live node)
      // But for putDeploy we need a working client.

      // Build runtime args
      const runtimeArgs = await this.buildRuntimeArgs(config.runtimeArgs || {});

      // Create deploy
      const deploy = DeployUtil.makeDeploy(
        new DeployUtil.DeployParams(
          CLPublicKey.fromHex(wallet.publicKey),
          config.chainName || 'casper-test',
          config.gasPrice || 1,
          config.ttl || 1800000
        ),
        DeployUtil.ExecutableDeployItem.newModuleBytes(
          wasmBytes,
          runtimeArgs
        ),
        DeployUtil.standardPayment(config.paymentAmount || 300000000000)
      );

      // Sign deploy with wallet
      const { CasperWalletService } = await import('./casper-wallet-service');
      const signedDeploy = await CasperWalletService.signDeploy(deploy, wallet);

      // Send deploy to network with fallback
      const deployHash = signedDeploy.hash;
      let deployResult;
      let lastError;

      for (const nodeUrl of nodes) {
        try {
          console.log(`Attempting to send deploy to ${nodeUrl}...`);
          const client = new CasperClient(nodeUrl);
          deployResult = await client.putDeploy(signedDeploy);
          if (deployResult) {
            console.log(`Successfully sent to ${nodeUrl}`);
            break;
          }
        } catch (err: any) {
          console.warn(`Failed to send to ${nodeUrl}:`, err.message);
          lastError = err;
        }
      }

      if (!deployResult) {
        throw new Error(`Failed to send deploy to network. Last error: ${lastError?.message || 'Unknown error'}`);
      }

      return {
        deployHash,
        contractHash: undefined
      };
    } catch (error: any) {
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  /**
   * Upgrade an existing contract
   */
  static async upgradeContract(
    wasmBytes: Uint8Array,
    contractPackageHash: string,
    wallet: WalletConnection,
    config: DeployConfig
  ): Promise<{ deployHash: string; version?: number }> {
    try {
      if (!wallet.connected || !wallet.publicKey) {
        throw new Error('Wallet not connected');
      }

      if (!contractPackageHash) {
        throw new Error('Contract package hash is required for upgrades');
      }

      // Use RPC proxy (auto-detects environment)
      const nodes = [this.RPC_PROXY];

      // Build runtime args - upgrades typically don't need special args
      const runtimeArgs = await this.buildRuntimeArgs(config.runtimeArgs || {});

      // Create upgrade deploy using standard module bytes
      // The contract's call() function should use add_contract_version internally
      const deploy = DeployUtil.makeDeploy(
        new DeployUtil.DeployParams(
          CLPublicKey.fromHex(wallet.publicKey),
          config.chainName || 'casper-test',
          config.gasPrice || 1,
          config.ttl || 1800000
        ),
        DeployUtil.ExecutableDeployItem.newModuleBytes(
          wasmBytes,
          runtimeArgs
        ),
        DeployUtil.standardPayment(config.paymentAmount || 300000000000)
      );

      // Sign deploy with wallet
      const { CasperWalletService } = await import('./casper-wallet-service');
      const signedDeploy = await CasperWalletService.signDeploy(deploy, wallet);

      // Send deploy to network
      const deployHash = signedDeploy.hash;
      let deployResult;
      let lastError;

      for (const nodeUrl of nodes) {
        try {
          console.log(`Sending upgrade to ${nodeUrl}...`);
          const client = new CasperClient(nodeUrl);
          deployResult = await client.putDeploy(signedDeploy);
          if (deployResult) {
            console.log(`Upgrade sent successfully to ${nodeUrl}`);
            break;
          }
        } catch (err: any) {
          console.warn(`Failed to send upgrade to ${nodeUrl}:`, err.message);
          lastError = err;
        }
      }

      if (!deployResult) {
        throw new Error(`Failed to send upgrade to network. Last error: ${lastError?.message || 'Unknown error'}`);
      }

      // Note: Version tracking would require querying the contract state
      // For now, we return undefined and let the UI handle it
      return {
        deployHash,
        version: undefined
      };
    } catch (error: any) {
      throw new Error(`Contract upgrade failed: ${error.message}`);
    }
  }

  /**
   * Build runtime arguments from object
   */
  private static async buildRuntimeArgs(args: Record<string, any>): Promise<any> {
    const runtimeArgsMap: Record<string, any> = {};

    for (const [key, value] of Object.entries(args)) {
      if (value === undefined || value === null || value === '') {
        continue; // Skip empty values
      }

      // Determine CLValue type from value
      if (typeof value === 'string') {
        // Try to detect if it's a number string
        if (/^-?\d+$/.test(value)) {
          runtimeArgsMap[key] = CLValueBuilder.u64(BigInt(value));
        } else if (/^-?\d+\.\d+$/.test(value)) {
          runtimeArgsMap[key] = CLValueBuilder.u512(BigInt(Math.floor(parseFloat(value))));
        } else {
          runtimeArgsMap[key] = CLValueBuilder.string(value);
        }
      } else if (typeof value === 'number') {
        if (Number.isInteger(value)) {
          runtimeArgsMap[key] = CLValueBuilder.u64(BigInt(value));
        } else {
          runtimeArgsMap[key] = CLValueBuilder.u512(BigInt(Math.floor(value)));
        }
      } else if (typeof value === 'boolean') {
        runtimeArgsMap[key] = CLValueBuilder.bool(value);
      } else if (typeof value === 'bigint') {
        runtimeArgsMap[key] = CLValueBuilder.u64(value);
      } else {
        runtimeArgsMap[key] = CLValueBuilder.string(String(value));
      }
    }

    return RuntimeArgs.fromMap(runtimeArgsMap);
  }

  /**
   * Get deploy status
   */
  static async getDeployStatus(
    deployHash: string,
    network: string = 'testnet'
  ): Promise<any> {
    try {
      const client = new CasperClient(this.NETWORKS[network as keyof typeof this.NETWORKS] || this.NETWORKS.testnet);

      const deploy = await client.getDeploy(deployHash);
      return deploy;
    } catch (error: any) {
      throw new Error(`Failed to get deploy status: ${error.message}`);
    }
  }

  /**
   * Get account named keys (to retrieve contract hash after deployment)
   * Uses RPC proxy to avoid CORS issues
   */
  static async getAccountNamedKeys(
    publicKeyHex: string,
    network: string = 'testnet'
  ): Promise<Record<string, string>> {
    try {
      const publicKey = CLPublicKey.fromHex(publicKeyHex);
      const accountHash = publicKey.toAccountHashStr();

      // Use RPC proxy to query account state
      const response = await fetch(this.RPC_PROXY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'query_global_state',
          params: {
            state_identifier: null, // Latest state
            key: accountHash,
            path: []
          }
        })
      });

      if (!response.ok) {
        throw new Error(`RPC returned ${response.status}`);
      }

      const data = await response.json();
      const namedKeys: Record<string, string> = {};

      // Parse named keys from RPC response
      if (data?.result?.stored_value?.Account?.named_keys) {
        for (const nk of data.result.stored_value.Account.named_keys) {
          namedKeys[nk.name] = nk.key;
        }
      }

      return namedKeys;
    } catch (error: any) {
      console.error('Failed to get account named keys:', error);
      throw new Error(`Failed to get account named keys: ${error.message}`);
    }
  }

  /**
   * Get contract hash from account by key name
   */
  static async getContractHash(
    publicKeyHex: string,
    keyName: string = 'counter_contract',
    network: string = 'testnet'
  ): Promise<string | null> {
    try {
      const namedKeys = await this.getAccountNamedKeys(publicKeyHex, network);
      return namedKeys[keyName] || null;
    } catch (error: any) {
      console.error(`Failed to get contract hash for key "${keyName}":`, error);
      return null;
    }
  }
}
