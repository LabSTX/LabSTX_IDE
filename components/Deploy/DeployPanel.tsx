import React, { useState, useEffect, useCallback } from 'react';
import { FileNode, WalletConnection, DeployedContract, CompilationResult, ProjectSettings } from '../../types';
import WalletConnectionComponent from './WalletConnection';
import { Button } from '../UI/Button';
import { RocketIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon } from '../UI/Icons';
import CodeEditor from '../Editor/CodeEditor';
import { openContractCall, request } from '@stacks/connect';
import { STACKS_TESTNET, STACKS_MAINNET, STACKS_MOCKNET } from '@stacks/network';
import { StacksWalletService } from '../../services/stacks/wallet';
import {
  uintCV, intCV, principalCV, standardPrincipalCV, contractPrincipalCV,
  trueCV, falseCV, noneCV, someCV, stringUtf8CV, stringAsciiCV, listCV, tupleCV,
  ClarityValue, serializeCV, deserializeCV, cvToValue
} from '@stacks/transactions';
import { bytesToHex, hexToBytes } from '@stacks/common';
import { runExclusively, getAccounts, getAccountBalance } from '../../services/stacks/simnet';
import { getProviders } from 'sats-connect';
import { XIcon, AlertCircle } from 'lucide-react';

const formatClarityType = (type: any): string => {
  if (!type) return 'unknown';
  if (typeof type === 'string') return type;

  if (type.uint128 !== undefined) return 'uint128';
  if (type.int128 !== undefined) return 'int128';
  if (type.bool !== undefined) return 'bool';
  if (type.principal !== undefined) return 'principal';
  if (type.standard_principal !== undefined) return 'principal';
  if (type.contract_principal !== undefined) return 'contract_principal';

  if (type['string-ascii'] !== undefined) {
    return `string-ascii ${type['string-ascii'].length}`;
  }
  if (type['string-utf8'] !== undefined) {
    return `string-utf8 ${type['string-utf8'].length}`;
  }

  if (type.list !== undefined) {
    return `list (${formatClarityType(type.list.type)})`;
  }

  if (type.tuple !== undefined) {
    const fields = type.tuple.map((f: any) => `${f.name}: ${formatClarityType(f.type)}`).join(', ');
    return `tuple (${fields})`;
  }

  if (type.optional !== undefined) {
    return `optional (${formatClarityType(type.optional)})`;
  }

  if (type.response !== undefined) {
    const okType = formatClarityType(type.response.ok);
    const errType = formatClarityType(type.response.error);
    return `response (ok: ${okType}, err: ${errType})`;
  }

  return typeof type === 'object' ? JSON.stringify(type) : String(type);
};

const formatCVValue = (val: any): string => {
  if (val === undefined || val === null) return 'none';
  if (typeof val === 'object') {
    return JSON.stringify(val, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2);
  }
  return String(val);
};

interface DeployPanelProps {
  files: FileNode[];
  wallet: WalletConnection;
  onWalletConnect: (wallet: WalletConnection) => void;
  onWalletDisconnect: () => void;
  compilationResult?: CompilationResult;
  onDeploySuccess?: (contract: DeployedContract) => void;
  onInteracted?: (contractName: string, entryPoint: string, network: string, metadata: any) => void;
  onAddTerminalLine?: (line: any) => void;
  width?: number;
  theme: 'dark' | 'light';
  settings?: ProjectSettings;
  onUpdateSettings?: (key: keyof ProjectSettings, value: any) => void;
  onFileSelect?: (fileId: string) => void;
  deployedContracts: DeployedContract[];
  setDeployedContracts: React.Dispatch<React.SetStateAction<DeployedContract[]>>;
  activeSimnetAccount?: string;
  onSimnetAccountChange?: (address: string) => void;
  onGoToInteract?: (hash: string) => void;
}

const DeployPanel: React.FC<DeployPanelProps> = ({
  files,
  wallet,
  onWalletConnect,
  onWalletDisconnect,
  compilationResult,
  onDeploySuccess,
  onInteracted,
  onAddTerminalLine,
  width = 320,
  theme,
  settings,
  onUpdateSettings,
  onFileSelect,
  deployedContracts,
  setDeployedContracts,
  activeSimnetAccount = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  onSimnetAccountChange,
  onGoToInteract
}) => {
  // Use global settings network as source of truth
  const network: 'testnet' | 'mainnet' | 'mocknet' | 'simnet' = settings?.network || 'testnet';

  // Local function to update network (updates global settings)
  const setNetwork = (newNet: 'testnet' | 'mainnet' | 'simnet') => {
    if (onUpdateSettings) {
      onUpdateSettings('network', newNet);
    }
  };
  const [deploying, setDeploying] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [contractName, setContractName] = useState<string>('');
  const [balance, setBalance] = useState<string>('0.00');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isAlreadyDeployed, setIsAlreadyDeployed] = useState(false);
  const [checkingDeployment, setCheckingDeployment] = useState(false);
  const [contractInterface, setContractInterface] = useState<any>(null);
  const [xverseWarningHandler, setXverseWarningHandler] = useState<{ resolve: (v: boolean) => void } | null>(null);

  // Advanced params
  const [customFee, setCustomFee] = useState<string>('');
  const [customNonce, setCustomNonce] = useState<string>('');
  const [feeUnit, setFeeUnit] = useState<'uSTX' | 'STX'>('STX');
  const [enablePostCondition, setEnablePostCondition] = useState(false);
  const [postConditionAmount, setPostConditionAmount] = useState('');
  const [interactContractHash, setInteractContractHash] = useState('');

  // Storage Explorer
  const [snippet, setSnippet] = useState('');

  // Virtual Wallet for Simnet
  const isSimnet = network === 'simnet';
  const [simnetAccounts, setSimnetAccounts] = useState<string[]>([]);
  const [simnetBalances, setSimnetBalances] = useState<Record<string, string>>({});
  const simnetDeployer = activeSimnetAccount;


  // Callback for fetching Simnet info
  const fetchSimnetInfo = useCallback(async () => {
    if (!isSimnet) return;
    try {
      const accounts = await getAccounts();
      setSimnetAccounts(accounts);

      const balances: Record<string, string> = {};
      for (const addr of accounts) {
        balances[addr] = await getAccountBalance(addr);
      }
      setSimnetBalances(balances);

      // Also ensure the primary balance state is sync'd
      if (simnetDeployer) {
        const bal = await getAccountBalance(simnetDeployer);
        setBalance(bal);
      }
    } catch (err) {
      console.error("Failed to fetch Simnet info:", err);
    }
  }, [isSimnet, simnetDeployer]);

  // Initial Fetch & Network Toggle
  useEffect(() => {
    if (isSimnet) {
      fetchSimnetInfo();
    }
  }, [isSimnet, fetchSimnetInfo]);


  // Sync wallet address with current network toggle
  useEffect(() => {
    if (isSimnet) return; // Don't sync wallet address to simnet here

    if (wallet.connected && onWalletConnect) {
      // Prioritize addresses map if available
      let correctAddress = '';
      if (wallet.addresses) {
        correctAddress = network === 'mainnet'
          ? (wallet.addresses.mainnet || '')
          : (wallet.addresses.testnet || '');
      }

      // Fallback to primary address if it matches the current network type
      if (!correctAddress && wallet.address) {
        const isCurrentlyTestnet = wallet.address.startsWith('ST');
        if ((network === 'testnet' && isCurrentlyTestnet) || (network === 'mainnet' && !isCurrentlyTestnet)) {
          correctAddress = wallet.address;
        }
      }

      if (correctAddress && (wallet.address !== correctAddress || wallet.network !== network)) {
        console.log(`[WalletSync] switching to ${network} (${correctAddress})`);
        onWalletConnect({
          ...wallet,
          address: correctAddress,
          network: network as any
        });
      }
    }
  }, [network, wallet.connected, wallet.addresses, wallet.address, wallet.network, onWalletConnect]);

  // Fetch balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (isSimnet) {
        const bal = await getAccountBalance(simnetDeployer);
        setBalance(bal);
        return;
      }

      if (wallet.connected) {
        // Use a temp balance reset to indicate loading
        setBalance('...');

        // Strictly use the address that matches the network
        let addressToUse = '';
        if (wallet.addresses) {
          addressToUse = network === 'mainnet' ? wallet.addresses.mainnet : wallet.addresses.testnet;
        }

        // If addresses map is missing or incomplete, check the current primary address
        if (!addressToUse && wallet.address) {
          const isStAddress = wallet.address.startsWith('ST');
          if ((network === 'testnet' && isStAddress) || (network === 'mainnet' && !isStAddress)) {
            addressToUse = wallet.address;
          }
        }

        if (addressToUse) {
          console.log(`[BalanceSync] Fetching for ${addressToUse} on ${network}`);
          const bal = await StacksWalletService.getBalance(addressToUse);
          setBalance(bal);
        } else {
          console.warn(`[BalanceSync] No valid address found for ${network}`);
          setBalance('0.00');
        }
      } else {
        setBalance('0.00');
      }
    };
    fetchBalance();

    // Refresh balance every 60 seconds (slower to be nicer to API)
    const interval = setInterval(fetchBalance, 60000);
    return () => clearInterval(interval);
  }, [wallet.connected, wallet.address, wallet.addresses, network]);

  const clarityFiles = React.useMemo(() => {
    const results: FileNode[] = [];
    const traverse = (nodeList: FileNode[]) => {
      nodeList.forEach(node => {
        if (node.type === 'file' && (node.name.endsWith('.clar') || node.language === 'clarity')) {
          results.push(node);
        }
        if (node.children) {
          traverse(node.children);
        }
      });
    };
    traverse(files);
    return results;
  }, [files]);

  useEffect(() => {
    if (clarityFiles.length > 0 && !selectedFileId) {
      setSelectedFileId(clarityFiles[0].id);
    }
  }, [clarityFiles, selectedFileId]);

  // Sync contract name when file changes
  useEffect(() => {
    const selectedFile = clarityFiles.find(f => f.id === selectedFileId);
    if (selectedFile && selectedFile.name) {
      const baseName = selectedFile.name.replace('.clar', '');
      // Ensure we don't accidentally grab a massive string if .name is weird
      const sanitized = baseName
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .substring(0, 40);

      // Safety check: if sanitization results in empty string, use a default
      setContractName(sanitized || 'unnamed-contract');
    }
  }, [selectedFileId, clarityFiles]);

  // Check if contract is already deployed
  useEffect(() => {
    const checkStatus = async () => {
      const selectedFile = clarityFiles.find(f => f.id === selectedFileId);
      if (!selectedFile) return;

      const currentContractName = selectedFile.name.replace('.clar', '');

      if (isSimnet) {
        // For Simnet, we check the local deployedContracts list
        const localDeployment = (deployedContracts || []).find(c =>
          c.name === currentContractName &&
          c.network === 'simnet' &&
          c.originalFileId === selectedFileId &&
          c.contractHash.startsWith(simnetDeployer)
        );

        if (localDeployment) {
          setIsAlreadyDeployed(true);


          // Try to derive ABI from compilation if available
          if (compilationResult?.metadata) {
            // Map entryPoints to functions and normalize access strings for UI consistency
            const mappedFunctions = (compilationResult.metadata.entryPoints || []).map(ep => ({
              ...ep,
              access: ep.access === 'Public' ? 'public' :
                ep.access === 'ReadOnly' ? 'read_only' : ep.access.toLowerCase()
            }));
            setContractInterface({ functions: mappedFunctions });
          }
        } else {
          setIsAlreadyDeployed(false);
          // Even if not deployed, for Simnet we can show the functions from compilation to help user
          if (compilationResult?.metadata) {
            const mappedFunctions = (compilationResult.metadata.entryPoints || []).map(ep => ({
              ...ep,
              access: ep.access === 'Public' ? 'public' :
                ep.access === 'ReadOnly' ? 'read_only' : ep.access.toLowerCase()
            }));
            setContractInterface({ functions: mappedFunctions });

            // Convenience: Auto-fill interact hash for Simnet even if not yet deployed
            const suggestedHash = `${simnetDeployer}.${currentContractName}`;
            if (!interactContractHash || interactContractHash.split('.').length < 2) {
              setInteractContractHash(suggestedHash);
            }
          } else {
            setContractInterface(null);
          }
        }
        return;
      }

      if (wallet.address && wallet.connected) {
        setCheckingDeployment(true);
        const exists = await StacksWalletService.checkContractExists(wallet.address, currentContractName, network);
        setIsAlreadyDeployed(exists);

        if (exists) {
          const abi = await StacksWalletService.getContractInterface(wallet.address, currentContractName, network);
          setContractInterface(abi);
        } else {
          setContractInterface(null);
        }

        setCheckingDeployment(false);
      } else {
        setIsAlreadyDeployed(false);
        setContractInterface(null);
      }
    };
    checkStatus();
  }, [selectedFileId, wallet.address, wallet.connected, network, clarityFiles, deployedContracts, isSimnet, compilationResult, activeSimnetAccount]);

  // Sync function arguments when entry point changes
  const handleDeploy = async () => {
    const selectedFile = clarityFiles.find(f => f.id === selectedFileId);
    if (!selectedFile || !selectedFile.content) {
      console.error('ERROR: No contract code available.');
      return;
    }

    if (!wallet.connected && !isSimnet) {
      console.error('ERROR: Please connect a wallet first');
      return;
    }

    if (isAlreadyDeployed) {
      const confirmRedeploy = confirm('This contract name is already deployed on this network from your address. Redeploying will likely fail as Clarity contracts are immutable. Do you want to proceed anyway?');
      if (!confirmRedeploy) return;
    }

    if (!contractName || contractName.length > 40) {
      alert('Contract name must be between 1 and 40 characters');
      return;
    }

    if (!/^[a-z_][a-z0-9-_]*$/.test(contractName.toLowerCase())) {
      alert('Invalid contract name. Use only letters, numbers, dashes, and underscores. Cannot start with a number.');
      return;
    }

    if (isSimnet) {
      await handleSimnetDeploy(selectedFile, contractName);
      return;
    }

    setDeploying(true);

    if (onAddTerminalLine) {
      onAddTerminalLine({
        type: 'command',
        content: `Broadcasting contract deployment: ${contractName} on ${network}...`
      });
    }

    try {
      // 1. Sanitize Clarity Code (in case it is JSON-wrapped)
      let clarityCode = selectedFile.content || '';
      if (clarityCode.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(clarityCode);
          if (parsed.json) clarityCode = parsed.json;
          else if (parsed.code) clarityCode = parsed.code;
          else if (parsed.content) clarityCode = parsed.content;
        } catch (e) {
          console.warn('[Deploy] Content starts with { but is not valid JSON, using raw string');
        }
      }

      // 2. Prepare Deployment Parameters
      // We use redundant keys (name/contractName, clarityCode/codeBody) 
      // to ensure compatibility across different wallet versions and library wrappers.
      const deployParams: any = {
        name: contractName.trim(),
        contractName: contractName.trim(),
        clarityCode: clarityCode,
        codeBody: clarityCode,
        // @ts-ignore - mapping network string
        network: network,
        postConditionMode: 'allow',
        clarityVersion: settings?.clarityVersion ? parseInt(settings.clarityVersion) : 2,
      };

      // Add project details for better wallet UI
      deployParams.appDetails = {
        name: 'LabSTX IDE',
        icon: window.location.origin + '/logo192.png',
      };

      // Add custom fee if specified
      if (customFee) {
        let microStx = feeUnit === 'STX'
          ? BigInt(Math.floor(parseFloat(customFee) * 1000000))
          : BigInt(customFee);
        deployParams.fee = microStx.toString();
      }

      // Add custom nonce if specified
      if (customNonce) {
        deployParams.nonce = customNonce;
      }

      if (onAddTerminalLine) {
        onAddTerminalLine({
          type: 'info',
          content: `Debug: Contract [${deployParams.name}] | Network: ${deployParams.network} | Clarity: v${deployParams.clarityVersion}`
        });
        onAddTerminalLine({
          type: 'info',
          content: `Debug: Code size: ${clarityCode.length} chars | Fee: ${deployParams.fee || 'Auto'} | Nonce: ${deployParams.nonce || 'Auto'}`
        });
      }

      //const result = await request('stx_deployContract', deployParams);
      const providers = getProviders();
      const isXverseInstalled = providers.find(p => p.id === 'XverseProviders.BitcoinProvider');
      const isLeatherInstalled = providers.find(p => p.id === 'LeatherProvider');
      let response;
      console.log('providers detected', providers);

      // FIX: Use 'wallet.type' to ensure only the wallet you are logged into fires.
      // If you don't check wallet.type, and both are installed, both popups try to open.
      if (wallet.type === 'leather' && isLeatherInstalled) {
        response = await request(
          { provider: (window as any).LeatherProvider || (window as any).StacksProvider },
          'stx_deployContract',
          deployParams
        );
      }
      else if (wallet.type === 'xverse' && isXverseInstalled) {
        // FIX: Xverse path is typically window.XverseProviders.Stacks
        setDeploying(false); // Stop broadcasting UI
        const proceed = await new Promise<boolean>((resolve) => {
          setXverseWarningHandler({ resolve });
        });
        setXverseWarningHandler(null);

        if (!proceed) return;

        setDeploying(true); // Resume broadcasting UI
        const xverseProvider = (window as any).XverseProviders?.Stacks || (window as any).BitcoinProvider;

        response = await request(
          { provider: xverseProvider },
          'stx_deployContract',
          deployParams
        );
      }

      if (response && response.txid) {
        console.log('Stacks Transaction broadcast:', response);

        if (onAddTerminalLine) {
          onAddTerminalLine({
            type: 'success',
            content: `Contract deployment broadcasted! TXID: ${response.txid.substring(0, 16)}...`
          });
        }

        const newContract: DeployedContract = {
          id: Math.random().toString(36).substr(2, 9),
          name: contractName,
          contractHash: `${wallet.address}.${contractName}`,
          deployHash: response.txid,
          network: network,
          timestamp: Date.now(),
          originalFileId: selectedFileId,
          entryPoints: compilationResult?.metadata?.entryPoints || []
        };

        if (onDeploySuccess) {
          onDeploySuccess(newContract);
        }

        // Telemetry Ingest for success
        fetch('/ide-api/stats/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'DEPLOYMENT',
            wallet: wallet.address || 'unconnected',
            payload: {
              contractName: contractName,
              network: network,
              status: 'success',
              metadata: {
                deployHash: response.txid,
                gas: '0.00 STX' // Placeholder as we don't have final gas yet
              }
            }
          })
        }).catch(err => console.error('Telemetry failed:', err));
      }
      setDeploying(false);

    } catch (error: any) {
      console.error('Deployment error:', error);

      // Check if it's a cancellation or a real error
      const isCancel = error?.message?.includes('cancel') || error === 'cancel' || error?.code === 'user_rejection';

      // Telemetry Ingest for failure (if not cancelled)
      if (!isCancel) {
        fetch('/ide-api/stats/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'DEPLOYMENT',
            wallet: wallet.address || 'unconnected',
            payload: {
              contractName: contractName,
              network: network,
              status: 'failure',
              metadata: {
                error: error.message || 'Unknown error'
              }
            }
          })
        }).catch(err => console.error('Telemetry failed:', err));
      }

      if (isCancel) {
        if (onAddTerminalLine) {
          onAddTerminalLine({
            type: 'info',
            content: 'Deployment cancelled by user.'
          });
        }
      } else {
        if (onAddTerminalLine) {
          onAddTerminalLine({
            type: 'error',
            content: `Deployment failed: ${error.message || 'Unknown error'}`
          });
        }
      }
      setDeploying(false);
    }
  };

  const handleSimnetDeploy = async (selectedFile: FileNode, name: string) => {
    setDeploying(true);
    if (onAddTerminalLine) {
      onAddTerminalLine({
        type: 'command',
        content: `Broadcasting local deployment to Simnet: ${name}...`
      });
    }

    try {
      let code = selectedFile.content || '';
      const result = await runExclusively(async (simnet) => {
        const clarityVersion = settings?.clarityVersion ? parseInt(settings.clarityVersion) : 2;
        // @ts-ignore - Signature is (name, code, requirements, sender, clarityVersion)
        return simnet.deployContract(name, code, [], simnetDeployer, clarityVersion);
      });

      console.log('[Simnet] Deployment result:', result);

      if (onAddTerminalLine) {
        onAddTerminalLine({
          type: 'success',
          content: `Contract ${name} deployed locally to Simnet!`
        });
      }

      const newContract: DeployedContract = {
        id: Math.random().toString(36).substr(2, 9),
        name: name,
        contractHash: `${simnetDeployer}.${name}`,
        deployHash: `local-${Date.now()}`,
        network: 'simnet',
        timestamp: Date.now(),
        originalFileId: selectedFileId,
        entryPoints: compilationResult?.metadata?.entryPoints || []
      };

      if (onDeploySuccess) {
        onDeploySuccess(newContract);

      }

      fetch('/ide-api/stats/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'DEPLOYMENT',
          wallet: wallet.address || 'unconnected',
          payload: {
            contractName: contractName,
            network: network,
            status: 'success',
            metadata: {
              //  deployHash: response.txid,

            }
          }
        })
      }).catch(err => console.error('Telemetry failed:', err));

      // Re-fetch balances to show gas deduction
      await fetchSimnetInfo();

    } catch (err: any) {
      console.error('[Simnet] Deployment failed:', err);


      // Check if it's a cancellation or a real error
      const isCancel = err?.message?.includes('cancel') || err === 'cancel' || err?.code === 'user_rejection';

      // Telemetry Ingest for failure (if not cancelled)
      if (!isCancel) {
        fetch('/ide-api/stats/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'DEPLOYMENT',
            wallet: wallet.address || 'unconnected',
            payload: {
              contractName: contractName,
              network: network,
              status: 'failure',
              metadata: {
                error: err.message || 'Unknown error'
              }
            }
          })
        }).catch(err => console.error('Telemetry failed:', err));
      }

      if (onAddTerminalLine) {
        // Capture full error details for Simnet (including Clarity backtrace if available in stack)
        const detailedError = err instanceof Error ? (err.stack || err.message) : (typeof err === 'object' ? JSON.stringify(err, null, 2) : String(err));
        onAddTerminalLine({
          type: 'error',
          content: `Simnet Deployment failed: ${detailedError}`
        });
      }
    } finally {
      setDeploying(false);
    }
  };

  const handleSimnetCall = async (targetAddress: string, targetContractName: string, methodName: string, args: ClarityValue[]) => {
    try {
      if (onAddTerminalLine) {
        onAddTerminalLine({
          type: 'command',
          content: `Simulating contract call on Simnet: ${targetAddress}.${targetContractName}::${methodName}...`
        });
      }

      const result = await runExclusively(async (simnet) => {
        const contractId = `${targetAddress}.${targetContractName}`;
        console.log(`[Simnet] Calling public fn ${methodName} on ${contractId}...`);
        return simnet.callPublicFn(contractId, methodName, args, activeSimnetAccount);
      });

      console.log('[Simnet] Call result:', result);

      if (onAddTerminalLine) {
        const readableResult = formatCVValue(cvToValue(result.result));
        onAddTerminalLine({
          type: 'result',
          content: `Simnet call returned: ${readableResult}`,
          data: { result: readableResult }
        });
      }

      if (onInteracted) {
        onInteracted(`${targetAddress}.${targetContractName}`, methodName, 'simnet', { result });
      }

      // Re-fetch balances to show gas deduction
      await fetchSimnetInfo();
    } catch (err: any) {
      console.error('[Simnet] Call failed:', err);
      if (onAddTerminalLine) {
        // Capture full error details for Simnet (including Clarity backtrace if available in stack)
        const detailedError = err instanceof Error ? (err.stack || err.message) : (typeof err === 'object' ? JSON.stringify(err, null, 2) : String(err));
        onAddTerminalLine({
          type: 'error',
          content: `Simnet Call failed: ${detailedError}`
        });
      }
    }
  };



  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-caspier-border flex items-center gap-2 bg-caspier-black min-w-0">
        <RocketIcon className="w-4 h-4 text-labstx-orange flex-shrink-0" />
        {width >= 200 && (
          <span className="text-xs font-bold text-caspier-text tracking-wider whitespace-nowrap">
            STX CONTRACT DEPLOY
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Wallet Section */}
        <section>
          {wallet.connected && <div className="flex justify-between items-center mb-2">

            <div className="flex items-center gap-2">
              <h3 className="text-[10px] font-bold text-caspier-muted uppercase tracking-tight">
                {isSimnet && wallet.connected ? '' : 'BALANCE:'}
              </h3>
            </div>
            {(wallet.connected || !isSimnet) && (
              <span className="text-[10px] font-mono font-bold text-labstx-orange bg-labstx-orange/10 px-1.5 py-0.5 rounded">
                {balance} STX
              </span>
            )}
          </div>
          }
          <div className="space-y-4">
            {isSimnet && (
              <div className="hidden space-y-2">
                <div className="relative group">
                  <select
                    value={activeSimnetAccount}
                    onChange={(e) => onSimnetAccountChange?.(e.target.value)}
                    className="w-full bg-caspier-dark border border-caspier-border text-caspier-text px-3 py-2.5 text-[11px] font-mono focus:border-labstx-orange outline-none rounded-sm transition-all appearance-none cursor-pointer"
                  >
                    {simnetAccounts.length > 0 ? (
                      simnetAccounts.map((addr, idx) => (
                        <option key={addr} value={addr}>
                          {idx === 0 ? 'Deployer' : `Account ${idx}`} ({simnetBalances[addr] || '...'} STX) - {addr.slice(0, 10)}...
                        </option>
                      ))
                    ) : (
                      <option value={activeSimnetAccount}>
                        Default Account - {activeSimnetAccount.slice(0, 10)}...
                      </option>
                    )}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                    <ChevronDownIcon className="w-3 h-3 text-caspier-muted" />
                  </div>
                </div>
                <p className="text-[8px] text-caspier-muted italic leading-tight px-1">
                  Simnet uses pre-funded virtual accounts. Switching here changes the sender for deployments and calls.
                </p>
              </div>
            )}

            <div className={isSimnet ? "pt-2 border-t border-caspier-border/30" : ""}>

              {!wallet.addresses && wallet.connected && !isSimnet && (
                <div className="mb-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-[9px] text-blue-400">
                  💡 Please <strong>Reconnect Wallet</strong> to enable seamless Mainnet/Testnet switching.
                </div>
              )}
              {!isSimnet && (
                <WalletConnectionComponent
                  wallet={wallet}
                  onConnect={onWalletConnect}
                  onDisconnect={onWalletDisconnect}
                  network={network as any}
                />
              )}
              {isSimnet && (
                <div className="group relative overflow-hidden border-caspier-border border border-white/10 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 p-4 transition-all hover:border-indigo-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20">
                        <CheckIcon className="h-3.5 w-3.5 text-indigo-400" />
                      </div>
                      <span className="text-xs font-semibold tracking-wider uppercase text-indigo-400">
                        Connected SIMNET
                      </span>
                    </div>
                    <button
                      onClick={() => { }}
                      className="rounded-lg p-1 text-caspier-muted hover:bg-red-500/10 hover:text-red-400 transition-all"
                      title="Disconnect"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-widest text-caspier-muted font-medium">Active Address</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono text-caspier-text">

                            ST1PQH...GZGM
                          </code>

                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-widest text-caspier-muted font-medium">Network</p>
                        <span className="text-xs font-bold text-caspier-text uppercase">
                          SIMNET                            </span>
                      </div>
                    </div>
                  </div>
                </div>

              )}
            </div>
          </div>
        </section>

        {/* Contract Selection */}
        <section>
          <h3 className="text-[10px] font-bold text-caspier-muted mb-2 uppercase tracking-tight">Select Contract</h3>
          <select
            value={selectedFileId}
            onChange={(e) => setSelectedFileId(e.target.value)}
            className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-2 text-sm focus:border-labstx-orange outline-none rounded-sm transition-colors"
          >
            {clarityFiles.length === 0 && <option value="">No .clar files found</option>}
            {clarityFiles.map(file => (
              <option key={file.id} value={file.id}>{file.name}</option>
            ))}
          </select>

          {/* Contract Name Input */}
          <div className="mt-3">
            <label className="text-[9px] font-bold text-caspier-muted mb-1 block uppercase tracking-tight">Contract Name (on-chain)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={contractName}
                onChange={(e) => setContractName(e.target.value)}
                placeholder="my-contract"
                maxLength={40}
                className="flex-1 bg-caspier-dark border border-caspier-border text-caspier-text px-2 py-1.5 text-xs focus:border-labstx-orange outline-none rounded-sm font-mono"
              />
              <div className="flex items-center text-[10px] text-caspier-muted bg-caspier-black px-2 border border-caspier-border rounded-sm">
                {contractName.length}/40
              </div>
            </div>
            <p className="text-[8px] text-caspier-muted mt-1 italic">Used as the unique ID for this contract on the blockchain</p>
          </div>


        </section>

        {/* Network Selection */}
        <section>
          <h3 className="text-[10px] font-bold text-caspier-muted mb-2 uppercase tracking-tight">Network</h3>
          <div className="grid grid-cols-3 gap-1">
            {(['mainnet', 'testnet', 'simnet'] as const).map((net) => (
              <button
                key={net}
                onClick={() => (net === 'simnet' || !wallet.connected) && setNetwork(net)}
                disabled={!isSimnet && wallet.connected && network !== net}
                className={`px-1 py-1.5 text-[10px] font-bold uppercase border rounded-sm transition-all ${network === net
                  ? 'bg-labstx-orange border-labstx-orange text-white'
                  : !isSimnet && wallet.connected
                    ? 'bg-caspier-dark border-caspier-border text-caspier-muted cursor-not-allowed opacity-50 grayscale'
                    : 'bg-caspier-dark border-caspier-border text-caspier-muted hover:border-labstx-orange'
                  }`}
              >
                {net}
              </button>
            ))}
          </div>
        </section>

        {/* Advanced Options */}
        <section className="bg-caspier-black/40 border border-caspier-border rounded p-2 overflow-hidden hidden">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex justify-between items-center text-[10px] font-bold text-caspier-muted uppercase tracking-tight"
          >
            <span>Advanced Options</span>
            {showAdvanced ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[9px] text-caspier-muted block">Custom Fee ({feeUnit})</label>
                  <div className="flex bg-caspier-black rounded border border-caspier-border p-0.5">
                    {(['uSTX', 'STX'] as const).map(u => (
                      <button
                        key={u}
                        onClick={() => setFeeUnit(u)}
                        className={`px-1.5 py-0.5 text-[8px] font-black rounded-xs transition-colors ${feeUnit === u ? 'bg-labstx-orange text-white' : 'text-caspier-muted hover:text-caspier-text'}`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  placeholder={feeUnit === 'uSTX' ? "e.g. 2000" : "e.g. 0.002"}
                  value={customFee}
                  onChange={(e) => setCustomFee(e.target.value)}
                  className="w-full bg-caspier-dark border border-caspier-border text-caspier-text px-2 py-1.5 text-xs focus:border-labstx-orange outline-none"
                />
              </div>

              <div className="pt-2 border-t border-caspier-border">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[9px] text-caspier-muted font-bold uppercase">STX Transfer Cap</label>
                  <label className="relative inline-flex items-center cursor-pointer scale-75 origin-right">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={enablePostCondition}
                      onChange={(e) => setEnablePostCondition(e.target.checked)}
                    />
                    <div className="w-7 h-4 bg-caspier-dark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-labstx-orange"></div>
                  </label>
                </div>
                {enablePostCondition && (
                  <div className="space-y-1 animate-in slide-in-from-top-1">
                    <input
                      type="number"
                      placeholder="Max STX to transfer"
                      value={postConditionAmount}
                      onChange={(e) => setPostConditionAmount(e.target.value)}
                      className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-1.5 text-xs focus:border-labstx-orange outline-none"
                    />
                    <p className="text-[8px] text-caspier-muted italic leading-tight">Prevents contract from taking more than {postConditionAmount || '0'} STX from your wallet.</p>
                  </div>
                )}
              </div>
              <div>
                <label className="text-[9px] text-caspier-muted mb-1 block">Custom Nonce</label>
                <input
                  type="text"
                  placeholder="Auto if empty"
                  value={customNonce}
                  onChange={(e) => setCustomNonce(e.target.value)}
                  className="w-full bg-caspier-dark border border-caspier-border text-caspier-text px-2 py-1.5 text-xs focus:border-labstx-orange outline-none"
                />
              </div>
            </div>
          )}
        </section>

        {/* Deploy Button */}
        <div className="space-y-2">
          {isAlreadyDeployed && (
            <div className="p-2 bg-labstx-orange/10 border border-caspier-border rounded text-[10px] text-labstx-orange flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckIcon className="w-3 h-3 flex-shrink-0" />
                <span>Already deployed {isSimnet ? 'locally' : 'on-chain'}</span>
              </div>
              <button
                onClick={() => {
                  const selectedFile = clarityFiles.find(f => f.id === selectedFileId);
                  if (selectedFile && (wallet.address || isSimnet)) {
                    const contractName = selectedFile.name.replace('.clar', '');
                    const principal = isSimnet ? simnetDeployer : wallet.address;
                    if (onGoToInteract) {
                      onGoToInteract(`${principal}.${contractName}`);
                    }
                  }
                }}
                className="text-[9px] font-bold underline hover:no-underline"
              >
                INTERACT
              </button>
            </div>
          )}
          {isSimnet && !compilationResult && (
            <div className="p-2 mb-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-[10px] text-yellow-500 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Ensure you compile your contract to be able to deploy contract to <strong className='uppercase'>simnet</strong></span>
            </div>
          )}
          <Button
            type="button"
            onClick={handleDeploy}
            disabled={deploying || (!isSimnet && !wallet.connected) || clarityFiles.length === 0 || checkingDeployment || (!isSimnet && isAlreadyDeployed) || (isSimnet && !compilationResult)}
            className={`w-full h-11 font-bold uppercase tracking-widest text-xs transition-all ${(isSimnet || wallet.connected) ? 'shadow-[4px_4px_0_0_rgba(255,107,0,0.3)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgba(255,107,0,0.4)]' : ''
              } ${(!isSimnet && isAlreadyDeployed) ? 'opacity-80' : ''}`}
            variant="primary"
          >
            {checkingDeployment ? 'Checking...' : deploying ? 'Broadcasting...' : (!isSimnet && isAlreadyDeployed) ? 'Contract is deployed' : (isSimnet && isAlreadyDeployed) ? 'Redeploy' : 'Deploy'}
          </Button>
        </div>
      </div>
      {xverseWarningHandler && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`w-full max-w-sm border rounded-lg shadow-lg p-6 ${theme === 'dark' ? 'bg-[#1e1e1e] border-caspier-border' : 'bg-white border-gray-200'}`}>
            <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              <span className="text-labstx-orange">⚠</span> Warning
            </h3>
            <p className={`text-sm  ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              <strong>Xverse</strong>  is not Stable for Contract deployment yet , it contains a bug in the extension for contract deployment. Please use Leather wallet.
            </p>
            <div className="invisible text-xs text-gray-500 my-3"> View the error here : <a href="https://github.com/secretkeylabs/xverse-web-extension/issues" target='_blank' className=' text-blue-500 hover:text-blue-600 hover:underline'>Xverse Wallet Deployment Issue</a></div>
            <div className="flex justify-end gap-3">
              <Button onClick={() => xverseWarningHandler.resolve(false)} variant="secondary" className="px-4 py-2 text-xs">
                Cancel
              </Button>
              <Button onClick={() => xverseWarningHandler.resolve(true)} variant="primary" className="px-4 py-2 text-xs">
                Continue anyway
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
};

export default DeployPanel;
