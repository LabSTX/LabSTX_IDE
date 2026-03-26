import React, { useState, useEffect } from 'react';
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
  setDeployedContracts
}) => {
  // Use global settings network as source of truth
  const network = settings?.network || 'testnet';

  // Local function to update network (updates global settings)
  const setNetwork = (newNet: 'testnet' | 'mainnet') => {
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

  // Advanced params
  const [customFee, setCustomFee] = useState<string>('');
  const [customNonce, setCustomNonce] = useState<string>('');

  // Interaction State
  const [interactContractHash, setInteractContractHash] = useState('');
  const [entryPoint, setEntryPoint] = useState('');
  const [argumentsJson, setArgumentsJson] = useState('{}');
  const [functionArgs, setFunctionArgs] = useState<Record<string, string>>({});
  const [showJsonInput, setShowJsonInput] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [requestingTokens, setRequestingTokens] = useState(false);

  // Advanced Security & Units
  const [feeUnit, setFeeUnit] = useState<'STX' | 'uSTX'>('uSTX');
  const [enablePostCondition, setEnablePostCondition] = useState(false);
  const [postConditionAmount, setPostConditionAmount] = useState('0');

  // Storage Explorer
  const [queryValue, setQueryValue] = useState<string | null>(null);
  const [loadingQuery, setLoadingQuery] = useState(false);


  // Sync wallet address with current network toggle
  useEffect(() => {
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
      if (selectedFile && wallet.address && wallet.connected) {
        setCheckingDeployment(true);
        const contractName = selectedFile.name.replace('.clar', '');
        const exists = await StacksWalletService.checkContractExists(wallet.address, contractName, network);
        setIsAlreadyDeployed(exists);

        if (exists) {
          const abi = await StacksWalletService.getContractInterface(wallet.address, contractName, network);
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
  }, [selectedFileId, wallet.address, wallet.connected, network, clarityFiles]);

  // Sync function arguments when entry point changes
  useEffect(() => {
    if (contractInterface && entryPoint) {
      const func = contractInterface.functions.find((f: any) => f.name === entryPoint);
      if (func && func.args) {
        const initialArgs: Record<string, string> = {};
        func.args.forEach((arg: any) => {
          initialArgs[arg.name] = '';
        });
        setFunctionArgs(initialArgs);
      } else {
        setFunctionArgs({});
      }
    } else {
      setFunctionArgs({});
    }
  }, [entryPoint, contractInterface]);

  const handleDeploy = async () => {
    const selectedFile = clarityFiles.find(f => f.id === selectedFileId);
    if (!selectedFile || !selectedFile.content) {
      console.error('ERROR: No contract code available.');
      return;
    }

    if (!wallet.connected) {
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

      const result = await request('stx_deployContract', deployParams);

        if (result && result.txid) {
          console.log('Stacks Transaction broadcast:', result);

          if (onAddTerminalLine) {
            onAddTerminalLine({
              type: 'success',
              content: `Contract deployment broadcasted! TXID: ${result.txid.substring(0, 16)}...`
            });
          }

          const newContract: DeployedContract = {
            id: Math.random().toString(36).substr(2, 9),
            name: contractName,
            contractHash: `${wallet.address}.${contractName}`,
            deployHash: result.txid,
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
                          deployHash: result.txid,
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

  const handleCallContract = async () => {
    if (!interactContractHash || !entryPoint) {
      alert('Please provide contract hash and function name');
      return;
    }

    // Helper to convert JS values to Clarity Values
    const toCV = (val: any): ClarityValue => {
      if (typeof val === 'number') return uintCV(val);
      if (typeof val === 'boolean') return val ? trueCV() : falseCV();
      if (val === null) return noneCV();
      if (typeof val === 'string') {
        if ((val.startsWith('SP') || val.startsWith('ST')) && (val.includes('.') || val.length >= 39)) {
          return principalCV(val);
        }
        return stringUtf8CV(val);
      }
      if (Array.isArray(val)) return listCV(val.map(toCV));
      if (typeof val === 'object') {
        const tupleData: any = {};
        for (const [k, v] of Object.entries(val)) {
          tupleData[k] = toCV(v);
        }
        return tupleCV(tupleData);
      }
      return stringUtf8CV(String(val));
    };

    try {
      const parts = interactContractHash.split('.');
      if (parts.length !== 2) throw new Error('Invalid contract hash format. Expected: principal.contract-name');

      const [targetAddress, targetContractName] = parts;

      let cvArgs: ClarityValue[] = [];
      
      if (showJsonInput) {
        try {
          const trimmedJson = argumentsJson.trim();
          if (!trimmedJson || trimmedJson === '{}' || trimmedJson === '[]') {
            cvArgs = [];
          } else {
            const parsed = JSON.parse(trimmedJson);
            if (Array.isArray(parsed)) {
              cvArgs = parsed.map(toCV);
            } else {
              cvArgs = [toCV(parsed)];
            }
          }
        } catch (e) {
          console.warn('Arguments parsing failed, sending empty args');
        }
      } else {
        // Use auto-generated arguments
        const func = contractInterface?.functions.find((f: any) => f.name === entryPoint);
        if (func && func.args) {
          cvArgs = func.args.map((argDef: any) => {
            const rawValue = functionArgs[argDef.name] || '';
            const typeStr = formatClarityType(argDef.type);

            // Conversion logic based on type
            if (typeStr === 'uint128') return uintCV(rawValue || 0);
            if (typeStr === 'int128') return intCV(rawValue || 0);
            if (typeStr === 'bool') return rawValue.toLowerCase() === 'true' ? trueCV() : falseCV();
            if (typeStr.includes('principal')) {
              return principalCV(rawValue);
            }
            if (typeStr.startsWith('string-ascii')) return stringAsciiCV(rawValue);
            if (typeStr.startsWith('string-utf8')) return stringUtf8CV(rawValue);
            
            // Fallback for complex types or others
            try {
              if (typeof rawValue === 'string' && (rawValue.startsWith('{') || rawValue.startsWith('['))) {
                return toCV(JSON.parse(rawValue));
              }
            } catch (e) {}
            
            return stringUtf8CV(rawValue);
          });
        }
      }

      console.log('Final Clarity Arguments:', cvArgs);

      // Network check
      if (wallet.network && wallet.network !== network) {
        const proceed = confirm(`Network Mismatch: Your wallet is on ${wallet.network} but the IDE is set to ${network}. This transaction will likely fail. Proceed anyway?`);
        if (!proceed) return;
      }

      const stxNetwork = network === 'mainnet' ? STACKS_MAINNET : network === 'testnet' ? STACKS_TESTNET : STACKS_MOCKNET;

      if (onAddTerminalLine) {
        onAddTerminalLine({
          type: 'command',
          content: `Broadcasting contract call: ${interactContractHash}::${entryPoint}...`,
          data: {
            args: argumentsJson
          }
        });
        onAddTerminalLine({
          type: 'info',
          content: `Debug: Target: ${targetAddress}.${targetContractName} | Function: ${entryPoint} | Network: ${network}`
        });
      }

      // Post-Conditions
      const postConditions: any[] = [];
      if (enablePostCondition && postConditionAmount && parseFloat(postConditionAmount) > 0) {
        try {
          // Import necessary functions if they weren't imported
          const { createSTXPostCondition, FungibleConditionCode } = await import('@stacks/transactions');
          const microStx = Math.floor(parseFloat(postConditionAmount) * 1000000);

          const postCondition = createSTXPostCondition(
            wallet.address!,
            FungibleConditionCode.LessEqual,
            microStx.toString()
          );
          postConditions.push(postCondition);
          console.log(`Added STX Post-Condition: User transfers <= ${postConditionAmount} STX`);
        } catch (pcErr) {
          console.error('Failed to create post-condition:', pcErr);
        }
      }

      await openContractCall({
        contractAddress: targetAddress.trim(),
        contractName: targetContractName.trim(),
        functionName: entryPoint.trim(),
        functionArgs: cvArgs,
        network: stxNetwork,
        postConditions,
        appDetails: {
          name: 'LabSTX IDE',
          icon: window.location.origin + '/logo192.png',
        },
        onFinish: (data) => {
          console.log('Contract call broadcast:', data);
          if (onAddTerminalLine) {
            onAddTerminalLine({
              type: 'success',
              content: `Contract call broadcasted! TXID: ${data.txId}`
            });
            onAddTerminalLine({
              type: 'info',
              content: 'Debug with stxer.xyz',
              data: { action: 'debug', txId: data.txId }
            });
          }
          
          if (onInteracted) {
              onInteracted(interactContractHash, entryPoint, network, { txId: data.txId });
          }

          // Telemetry Ingest for Interaction
          fetch('/ide-api/stats/ingest', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  eventType: 'INTERACTION',
                  wallet: wallet.address || 'unconnected',
                  payload: {
                      contractName: interactContractHash,
                      functionName: entryPoint,
                      network: network,
                      status: 'success',
                      metadata: {
                          txId: data.txId
                      }
                  }
              })
          }).catch(err => console.error('Telemetry failed:', err));
        },
        onCancel: () => {
          console.log('Call cancelled');
          if (onAddTerminalLine) {
            onAddTerminalLine({
              type: 'info',
              content: 'Contract call cancelled by user.'
            });
          }
        }
      });
    } catch (err: any) {
      alert(`Interaction Error: ${err.message}`);
      if (onAddTerminalLine) {
        onAddTerminalLine({
          type: 'error',
          content: `Contract call failed: ${err.message}`
        });
      }
    }
  };



  const clearHistory = () => {
    if (confirm('Clear all deployment history?')) {
      setDeployedContracts([]);
    }
  };

  const handleQueryState = async () => {
    if (!interactContractHash || !keyName) {
      alert('Key Name and Contract Hash are required for state query');
      return;
    }

    // Helper to convert JS values to Clarity Values
    const toCV = (val: any): ClarityValue => {
      if (typeof val === 'number') return uintCV(val);
      if (typeof val === 'boolean') return val ? trueCV() : falseCV();
      if (val === null) return noneCV();
      if (typeof val === 'string') {
        if ((val.startsWith('SP') || val.startsWith('ST')) && (val.includes('.') || val.length >= 39)) {
          return principalCV(val);
        }
        return stringUtf8CV(val);
      }
      if (Array.isArray(val)) return listCV(val.map(toCV));
      if (typeof val === 'object') {
        const tupleData: any = {};
        for (const [k, v] of Object.entries(val)) {
          tupleData[k] = toCV(v);
        }
        return tupleCV(tupleData);
      }
      return stringUtf8CV(String(val));
    };

    try {
      const [contractAddress, contractName] = interactContractHash.split('.');
      const apiUrl = network === 'mainnet'
        ? 'https://api.mainnet.hiro.so'
        : 'https://api.testnet.hiro.so';

      let cvArgs: string[] = [];
      try {
        let rawCvArgs: ClarityValue[] = [];
        
        if (showJsonInput) {
          const parsed = JSON.parse(argumentsJson);
          const argsArray = Array.isArray(parsed) ? parsed : [parsed];
          rawCvArgs = argsArray.map(toCV);
        } else {
          // Use auto-generated arguments from entryPoint/keyName
          // First try to find the definition in ABI
          const func = contractInterface?.functions.find((f: any) => f.name === keyName) || 
                       contractInterface?.functions.find((f: any) => f.name === entryPoint);
          
          if (func && func.args) {
            rawCvArgs = func.args.map((argDef: any) => {
              const rawValue = functionArgs[argDef.name] || '';
              const typeStr = formatClarityType(argDef.type);
              if (typeStr === 'uint128') return uintCV(rawValue || 0);
              if (typeStr === 'int128') return intCV(rawValue || 0);
              if (typeStr === 'bool') return rawValue.toLowerCase() === 'true' ? trueCV() : falseCV();
              if (typeStr.includes('principal')) {
                return principalCV(rawValue);
              }
              if (typeStr.startsWith('string-ascii')) return stringAsciiCV(rawValue);
              if (typeStr.startsWith('string-utf8')) return stringUtf8CV(rawValue);
              return stringUtf8CV(rawValue);
            });
          }
        }

        cvArgs = rawCvArgs.map(cv => {
          const bytes = serializeCV(cv);
          return '0x' + (typeof bytes === 'string' ? bytes : bytesToHex(bytes as Uint8Array));
        });
      } catch (e) {
        console.warn('Query arguments parsing failed', e);
      }

      if (onAddTerminalLine) {
        onAddTerminalLine({
          type: 'info',
          content: `Debug: Querying State [${keyName}] from ${contractAddress}.${contractName} on ${network}`
        });
      }

      console.log(`Querying ${keyName}...`);

      const response = await fetch(`${apiUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/${keyName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: wallet.address || contractAddress,
          arguments: cvArgs
        })
      });

      const result = await response.json();

      if (result.okay) {
        console.log('Query result (raw):', result.result);
        try {
          // Decode the Hex mapping to human-readable Clarity Value
          const hex = result.result.startsWith('0x') ? result.result.slice(2) : result.result;
          const decodedCV = deserializeCV(hexToBytes(hex));
          const humanReadable = cvToValue(decodedCV);

          // Format based on type
          const formatted = typeof humanReadable === 'object'
            ? JSON.stringify(humanReadable, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2)
            : String(humanReadable);

          console.log('Decoded Result:', humanReadable);

          // Add to terminal logs
          if (onAddTerminalLine) {
            onAddTerminalLine({
              type: 'query',
              content: `${keyName} call returned value`,
              data: {
                contract: `${contractAddress}.${contractName}`,
                function: keyName,
                args: argumentsJson.trim() || '[]',
                result: formatted
              }
            });
          }

          // Telemetry Ingest for Query
          fetch('/ide-api/stats/ingest', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  eventType: 'QUERY',
                  wallet: wallet.address || 'unconnected',
                  payload: {
                      contractName: interactContractHash,
                      functionName: keyName,
                      network: network,
                      status: 'success'
                  }
              })
          }).catch(err => console.error('Telemetry failed:', err));

          // alert(`Query Result:\n${formatted}`);
        } catch (decodeErr) {
          console.warn('Failed to decode result hex, showing raw:', decodeErr);
          //  alert(`Query Result (Raw): ${result.result}`);
        }
      } else {
        console.error('Query failed:', result.cause);
        //  alert(`Query Failed: ${result.cause || 'Unknown Error'}. Ensure the contract is confirmed on-chain.`);

        if (onAddTerminalLine) {
          onAddTerminalLine({
            type: 'error',
            content: `Query failed for ${keyName}: ${result.cause || 'Unknown Error'}`
          });
        }
      }
    } catch (err: any) {
      alert(`Query Error: ${err.message}`);
    }
  };

  const fetchStateValue = async (targetKey: string, isMap: boolean = false) => {
    if (!interactContractHash || !targetKey) return;

    setLoadingQuery(true);
    setQueryValue(null);

    try {
      const [targetAddress, targetContractName] = interactContractHash.split('.');
      const apiUrl = network === 'mainnet' ? 'https://api.mainnet.hiro.so' : 'https://api.testnet.hiro.so';

      if (isMap) {
        if (onAddTerminalLine) onAddTerminalLine({ type: 'info', content: `To query map ${targetKey}, please use the Entry Point area with the map-get logic.` });
      } else {
        const response = await fetch(`${apiUrl}/v2/contracts/call-read/${targetAddress}/${targetContractName}/${targetKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: wallet.address || targetAddress,
            arguments: []
          })
        });

        const result = await response.json();
        if (result.okay) {
          const hex = result.result.startsWith('0x') ? result.result.slice(2) : result.result;
          const decodedCV = deserializeCV(hexToBytes(hex));
          const humanReadable = cvToValue(decodedCV);

          const formatted = typeof humanReadable === 'object'
            ? JSON.stringify(humanReadable, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2)
            : String(humanReadable);

          setQueryValue(formatted);
          if (onAddTerminalLine) {
            onAddTerminalLine({
              type: 'query',
              content: `State fetched: ${targetKey}`,
              data: { result: formatted }
            });
          }
        } else {
          setQueryValue(`Error: ${result.cause || 'Unknown'}`);
        }
      }
    } catch (err: any) {
      setQueryValue(`Error: ${err.message}`);
    } finally {
      setLoadingQuery(false);
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
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-[10px] font-bold text-caspier-muted uppercase tracking-tight">BALANCE:</h3>

            </div>
            {wallet.connected && (
              <span className="text-[10px] font-mono font-bold text-labstx-orange bg-labstx-orange/10 px-1.5 py-0.5 rounded">
                {balance} STX
              </span>
            )}
          </div>
          {!wallet.addresses && wallet.connected && (
            <div className="mb-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-[9px] text-blue-400">
              💡 Please <strong>Reconnect Wallet</strong> to enable seamless Mainnet/Testnet switching.
            </div>
          )}
          <WalletConnectionComponent
            wallet={wallet}
            onConnect={onWalletConnect}
            onDisconnect={onWalletDisconnect}
            network={network as any}
          />
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
          <div className="grid grid-cols-2 gap-1">
            {(['mainnet', 'testnet'] as const).map((net) => (
              <button
                key={net}
                onClick={() => !wallet.connected && setNetwork(net)}
                disabled={wallet.connected && network !== net}
                className={`px-1 py-1.5 text-[10px] font-bold uppercase border rounded-sm transition-all ${network === net
                  ? 'bg-labstx-orange border-labstx-orange text-white'
                  : wallet.connected
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
        <section className="bg-caspier-black/40 border border-caspier-border rounded p-2 overflow-hidden">
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
                <span>Already deployed on-chain</span>
              </div>
              <button
                onClick={() => {
                  const selectedFile = clarityFiles.find(f => f.id === selectedFileId);
                  if (selectedFile && wallet.address) {
                    const contractName = selectedFile.name.replace('.clar', '');
                    setInteractContractHash(`${wallet.address}.${contractName}`);
                    document.getElementById('interaction-section')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="text-[9px] font-bold underline hover:no-underline"
              >
                INTERACT
              </button>
            </div>
          )}
          <Button
            onClick={handleDeploy}
            disabled={deploying || !wallet.connected || clarityFiles.length === 0 || checkingDeployment || isAlreadyDeployed}
            className={`w-full h-11 font-bold uppercase tracking-widest text-xs transition-all ${wallet.connected ? 'shadow-[4px_4px_0_0_rgba(255,107,0,0.3)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgba(255,107,0,0.4)]' : ''
              } ${isAlreadyDeployed ? 'opacity-80' : ''}`}
            variant="primary"
          >
            {checkingDeployment ? 'Checking...' : deploying ? 'Broadcasting...' : isAlreadyDeployed ? 'Contract is deployed' : 'Deploy'}
          </Button>
        </div>

        {/* Interact with Contract */}
        <section id="interaction-section" className="pt-6 border-t border-caspier-border space-y-5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-labstx-orange animate-pulse" />
            <h3 className="text-[10px] font-bold text-caspier-text uppercase tracking-widest">Interact with Contract</h3>
          </div>

          <div>
            <label className="text-[9px] font-bold text-caspier-muted mb-2 block uppercase tracking-tight">Contract Hash</label>
            <div className="space-y-2">
              <select
                value={interactContractHash}
                onChange={(e) => setInteractContractHash(e.target.value)}
                className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-2 text-[11px] focus:border-labstx-orange outline-none rounded-sm transition-colors"
              >
                <option value="">Select deployed contract...</option>
                {deployedContracts.map(c => (
                  <option key={c.id} value={c.contractHash}>{c.name} ({c.contractHash.substring(0, 6)}...)</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Or paste contract hash here..."
                value={interactContractHash}
                onChange={(e) => setInteractContractHash(e.target.value)}
                className="w-full bg-caspier-dark border border-caspier-border text-caspier-text px-2 py-2 text-[11px] focus:border-labstx-orange outline-none rounded-sm transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {contractInterface && (
              <div className="bg-caspier-dark/50 border border-caspier-border rounded p-3 space-y-3">
                <div className="flex items-center justify-between border-b border-caspier-border pb-2">
                  <h4 className="text-[10px] font-black text-labstx-orange uppercase tracking-widest">Available Functions</h4>
                  <span className="text-[8px] text-caspier-muted px-1.5 py-0.5 bg-caspier-black rounded border border-caspier-border uppercase">Found on-chain</span>
                </div>

                <div className="space-y-4">
                  {/* Public Functions (State Changing) */}
                  {contractInterface.functions.filter((f: any) => f.access === 'public').length > 0 && (
                    <div>
                      <p className="text-[9px] font-bold text-caspier-muted mb-2 uppercase opacity-60">Write Operations</p>
                      <div className="flex flex-wrap gap-1.5">
                        {contractInterface.functions
                          .filter((f: any) => f.access === 'public')
                          .map((f: any) => (
                            <button
                              key={f.name}
                              onClick={() => setEntryPoint(f.name)}
                              className={`px-2 py-1 text-[10px] font-mono border rounded transition-all ${entryPoint === f.name
                                ? 'bg-labstx-orange text-white border-labstx-orange'
                                : 'bg-caspier-black text-caspier-text border-caspier-border hover:border-labstx-orange'
                                }`}
                            >
                              {f.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Read-Only Functions */}
                  {contractInterface.functions.filter((f: any) => f.access === 'read_only').length > 0 && (
                    <div>
                      <p className="text-[9px] font-bold text-caspier-muted mb-2 uppercase opacity-60">Read Operations</p>
                      <div className="flex flex-wrap gap-1.5">
                        {contractInterface.functions
                          .filter((f: any) => f.access === 'read_only')
                          .map((f: any) => (
                            <button
                              key={f.name}
                              onClick={() => {
                                setEntryPoint(f.name);
                                setKeyName(f.name); // Also set for state query
                              }}
                              className={`px-2 py-1 text-[10px] font-mono border rounded transition-all ${(entryPoint === f.name || keyName === f.name)
                                ? 'bg-green-600 text-white border-green-500'
                                : 'bg-caspier-black text-caspier-text border-caspier-border hover:border-green-500'
                                }`}
                            >
                              {f.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="text-[9px] font-bold text-caspier-muted mb-1 block uppercase tracking-tight">Entry Point</label>
              <input
                type="text"
                placeholder="e.g., increment, get_count"
                value={entryPoint}
                onChange={(e) => setEntryPoint(e.target.value)}
                className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-2 text-[11px] focus:border-labstx-orange outline-none rounded-sm font-mono"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold text-caspier-muted block uppercase tracking-tight">
                  {showJsonInput ? 'Arguments (JSON)' : 'Function Arguments'}
                </label>
                <button
                  onClick={() => setShowJsonInput(!showJsonInput)}
                  className="text-[9px] font-bold text-labstx-orange hover:underline uppercase tracking-tighter"
                >
                  {showJsonInput ? 'Use Auto-Fields' : 'Use Raw JSON'}
                </button>
              </div>

              {showJsonInput ? (
                <textarea
                  placeholder="{}"
                  value={argumentsJson}
                  onChange={(e) => setArgumentsJson(e.target.value)}
                  className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-2 text-[11px] focus:border-labstx-orange outline-none rounded-sm font-mono h-24 resize-none"
                />
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const func = contractInterface?.functions.find((f: any) => f.name === entryPoint);
                    if (func && func.args && func.args.length > 0) {
                      return func.args.map((arg: any) => (
                        <div key={arg.name}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-mono text-caspier-text">{arg.name}</span>
                            <span className="text-[8px] font-mono text-caspier-muted italic bg-caspier-black px-1 rounded border border-caspier-border">{formatClarityType(arg.type)}</span>
                          </div>
                          <input
                            type="text"
                            placeholder={formatClarityType(arg.type) === 'uint128' ? 'e.g. 1000' : formatClarityType(arg.type) === 'bool' ? 'true / false' : `Enter ${arg.name}...`}
                            value={functionArgs[arg.name] || ''}
                            onChange={(e) => setFunctionArgs({ ...functionArgs, [arg.name]: e.target.value })}
                            className="w-full bg-caspier-dark border border-caspier-border text-caspier-text px-2 py-1.5 text-[11px] focus:border-labstx-orange outline-none rounded-sm font-mono"
                          />
                        </div>
                      ));
                    } else if (entryPoint) {
                      return (
                        <div className="p-3 bg-caspier-black/30 border border-caspier-border rounded border-dashed text-center">
                          <p className="text-[10px] text-caspier-muted italic">No arguments needed for this function</p>
                        </div>
                      );
                    } else {
                      return (
                        <div className="p-3 bg-caspier-black/30 border border-caspier-border rounded border-dashed text-center">
                          <p className="text-[10px] text-caspier-muted italic">Select a function to see its arguments</p>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleCallContract}
                className="w-full text-[10px] font-black uppercase tracking-widest py-2.5 bg-labstx-orange text-white border-labstx-orange hover:shadow-neobrutal-sm active:shadow-none translate-x-[-1px] translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px]"
                variant="primary"
              >
                Call Contract
              </Button>
              <p className="text-[9px] text-caspier-muted text-center italic">Results will appear in the terminal below</p>
            </div>
          </div>

          <div className="bg-caspier-black/30 border border-caspier-border rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-caspier-muted uppercase tracking-tighter">Query State (Free Read)</h4>
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
            </div>

            <div>
              <label className="text-[9px] font-bold text-caspier-muted mb-1 block uppercase tracking-tight">Key / Var Name</label>
              <input
                type="text"
                placeholder="count"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="w-full bg-caspier-black border border-caspier-border text-caspier-text px-2 py-2 text-[11px] focus:border-labstx-orange outline-none rounded-sm font-mono"
              />
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2">
                <Button
                  onClick={handleQueryState}
                  className="w-full text-[10px] font-black uppercase tracking-widest py-2 bg-caspier-dark border-caspier-border text-caspier-text hover:border-labstx-orange transition-all"
                  variant="secondary"
                >
                  Query State
                </Button>
              </div>

              {queryValue && (
                <div className="p-2 bg-caspier-black border border-caspier-border rounded animate-in fade-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[8px] text-caspier-muted uppercase font-bold tracking-tighter">Result</span>
                    <button onClick={() => setQueryValue(null)} className="text-[8px] text-caspier-muted hover:text-white">CLEAR</button>
                  </div>
                  <pre className="text-[10px] font-mono text-green-400 break-all whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {queryValue}
                  </pre>
                </div>
              )}

              <p className="text-[8px] text-caspier-muted text-center leading-tight">No gas required - reads state directly from chain</p>
            </div>
          </div>

          {/* Quick Explorer (Maps & Variables) */}
          {contractInterface && (contractInterface.variables.length > 0 || contractInterface.maps.length > 0) && (
            <div className="bg-caspier-black/30 border border-caspier-border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-caspier-muted uppercase tracking-tighter">Storage Explorer</h4>
                <div className="w-1.5 h-1.5 rounded-full bg-labstx-orange" />
              </div>

              <div className="space-y-4 max-h-64 overflow-y-auto pr-1 thin-scrollbar">
                {contractInterface.variables.length > 0 && (
                  <div>
                    <p className="text-[8px] font-black text-caspier-muted mb-1.5 uppercase opacity-60">Constants & Variables</p>
                    <div className="flex flex-wrap gap-1">
                      {contractInterface.variables.map((v: any) => (
                        <button
                          key={v.name}
                          onClick={() => {
                            setKeyName(v.name);
                            fetchStateValue(v.name);
                          }}
                          className="px-2 py-0.5 text-[9px] font-mono bg-caspier-dark border border-caspier-border rounded hover:border-labstx-orange transition-colors"
                        >
                          {v.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {contractInterface.maps.length > 0 && (
                  <div>
                    <p className="text-[8px] font-black text-caspier-muted mb-1.5 uppercase opacity-60">Maps (Requires Key)</p>
                    <div className="flex flex-wrap gap-1">
                      {contractInterface.maps.map((m: any) => (
                        <button
                          key={m.name}
                          onClick={() => {
                            setKeyName(m.name);
                            if (onAddTerminalLine) onAddTerminalLine({ type: 'info', content: `Query map ${m.name} using the arguments field below.` });
                          }}
                          className="px-2 py-0.5 text-[9px] font-mono bg-caspier-dark border border-caspier-border rounded hover:border-labstx-orange transition-colors"
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default DeployPanel;
