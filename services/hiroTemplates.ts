import { FileNode } from '../types';

export interface HiroTemplate {
  id: string;
  name: string;
  description: string;
  repoUrl: string; // e.g. https://github.com/hirosystems/platform-template-fungible-token
  readmeUrl: string; // e.g. https://raw.githubusercontent.com/hirosystems/platform-template-fungible-token/refs/heads/main/README.md
  previewPath?: string; // Main Clarity contract path in the repo
}

export const HIRO_TEMPLATES: HiroTemplate[] = [
  {
    id: 'ft-template',
    name: 'Fungible Token',
    description: 'A standard SIP-010 fungible token template for the Hiro Platform.',
    repoUrl: 'https://github.com/hirosystems/platform-template-fungible-token',
    readmeUrl: 'https://raw.githubusercontent.com/hirosystems/platform-template-fungible-token/refs/heads/main/README.md',
    previewPath: 'contracts/fungible-token.clar'
  },
  {
    id: 'nft-template',
    name: 'Non-Fungible Token',
    description: 'A standard SIP-009 non-fungible token template for the Hiro Platform.',
    repoUrl: 'https://github.com/hirosystems/platform-template-non-fungible-token',
    readmeUrl: 'https://raw.githubusercontent.com/hirosystems/platform-template-non-fungible-token/refs/heads/main/README.md',
    previewPath: 'contracts/non-fungible-token.clar'
  },
  {
    id: 'sft-template',
    name: 'Semi-Fungible Token',
    description: 'A standard SIP-013 semi-fungible token template for the Hiro Platform.',
    repoUrl: 'https://github.com/hirosystems/platform-template-semi-fungible-token',
    readmeUrl: 'https://raw.githubusercontent.com/hirosystems/platform-template-semi-fungible-token/refs/heads/main/README.md',
    previewPath: 'contracts/semi-fungible-token.clar'
  },
  {
    id: 'hello-world',
    name: 'Hello World',
    description: 'A simple "Hello World" smart contract template for the Stacks blockchain.',
    repoUrl: 'https://github.com/hirosystems/platform-template-hello-world',
    readmeUrl: 'https://raw.githubusercontent.com/hirosystems/platform-template-hello-world/refs/heads/main/README.md',
    previewPath: 'contracts/hello-world.clar'
  },
  {
    id: 'counter-template',
    name: 'Counter',
    description: 'A simple counter smart contract demonstrating state management in Clarity.',
    repoUrl: 'https://github.com/hirosystems/platform-template-counter',
    readmeUrl: 'https://raw.githubusercontent.com/hirosystems/platform-template-counter/refs/heads/main/README.md',
    previewPath: 'contracts/counter.clar'
  },
  {
    id: 'blank-project',
    name: 'Blank Project',
    description: 'A bare-bones starter project for building Stacks applications.',
    repoUrl: 'https://github.com/hirosystems/platform-template-blank-project',
    readmeUrl: 'https://raw.githubusercontent.com/hirosystems/platform-template-blank-project/refs/heads/main/README.md',
    previewPath: 'contracts/blank-project.clar'
  },
  {
    id: 'btc-tx-enabled-nft',
    name: 'BTC TX Enabled NFT',
    description: 'An NFT smart contract that enables minting verified by Bitcoin transactions.',
    repoUrl: 'https://github.com/hirosystems/platform-template-btc-tx-enabled-nft',
    readmeUrl: 'https://raw.githubusercontent.com/hirosystems/platform-template-btc-tx-enabled-nft/refs/heads/main/README.md',
    previewPath: 'contracts/btc-tx-enabled-nft.clar'
  },
  {
    id: 'clarity-bitcoin',
    name: 'Clarity Bitcoin',
    description: 'A template demonstrating how to verify Bitcoin transactions directly within Clarity.',
    repoUrl: 'https://github.com/hirosystems/platform-template-clarity-bitcoin',
    readmeUrl: 'https://raw.githubusercontent.com/hirosystems/platform-template-clarity-bitcoin/refs/heads/main/README.md',
    previewPath: 'contracts/clarity-bitcoin.clar'
  },
  {
    id: 'lightning-swaps',
    name: 'Lightning Swaps',
    description: 'A smart contract template for executing cross-chain Lightning network swaps.',
    repoUrl: 'https://github.com/hirosystems/platform-template-lightning-swaps',
    readmeUrl: 'https://raw.githubusercontent.com/hirosystems/platform-template-lightning-swaps/refs/heads/main/README.md',
    previewPath: 'contracts/lightning-swaps.clar'
  },
  {
    id: 'stx-defi',
    name: 'STX DeFi',
    description: 'A basic decentralized finance smart contract template for depositing and borrowing STX.',
    repoUrl: 'https://github.com/hirosystems/platform-template-stx-defi',
    readmeUrl: 'https://raw.githubusercontent.com/hirosystems/platform-template-stx-defi/refs/heads/main/README.md',
    previewPath: 'contracts/stx-defi.clar'
  },
  {
    id: 'ordyswap',
    name: 'Ordyswap',
    description: 'A template demonstrating swapping capabilities across Ordinals and Stacks.',
    repoUrl: 'https://github.com/hirosystems/platform-template-ordyswap',
    readmeUrl: 'https://raw.githubusercontent.com/hirosystems/platform-template-ordyswap/refs/heads/main/README.md',
    previewPath: 'contracts/ordyswap.clar'
  },
  {
    id: 'nft-marketplace',
    name: 'NFT Marketplace',
    description: 'A foundation for building decentralized NFT marketplaces on Stacks.',
    repoUrl: 'https://github.com/hirosystems/platform-template-nft-marketplace',
    readmeUrl: 'https://raw.githubusercontent.com/hirosystems/platform-template-nft-marketplace/refs/heads/main/README.md',
    previewPath: 'contracts/nft-marketplace.clar'
  },
  {
    id: 'nft-marketplace-dapp',
    name: 'NFT Marketplace DApp',
    description: 'A full-stack demo of an NFT marketplace allowing users to mint, list, and purchase NFTs using STX.',
    repoUrl: 'https://github.com/hirosystems/platform-template-nft-marketplace-dapp',
    readmeUrl: 'https://raw.githubusercontent.com/hirosystems/platform-template-nft-marketplace-dapp/refs/heads/main/README.md',
    previewPath: 'contracts/nft-marketplace.clar'
  },
  {
    id: 'fundraising-dapp',
    name: 'Fundraising DApp',
    description: 'A full-stack decentralized application template for managing fundraising campaigns.',
    repoUrl: 'https://github.com/hirosystems/platform-template-fundraising-dapp',
    readmeUrl: 'https://raw.githubusercontent.com/hirosystems/platform-template-fundraising-dapp/refs/heads/main/README.md',
    previewPath: 'contracts/fundraising.clar'
  },
  {
    id: 'stacks-wallet',
    name: 'Stacks Wallet',
    description: 'A full-stack template comprising a wallet extension, front-end app, and a Clarity contract.',
    repoUrl: 'https://github.com/hirosystems/platform-template-stacks-wallet',
    readmeUrl: 'https://raw.githubusercontent.com/hirosystems/platform-template-stacks-wallet/refs/heads/main/README.md',
    previewPath: 'contracts/stacks-wallet.clar'
  },
  {
    id: 'post-conditions',
    name: 'Post Conditions',
    description: 'A template showcasing the power of post-conditions through multiple Clarity scenarios.',
    repoUrl: 'https://github.com/hirosystems/platform-template-post-conditions',
    readmeUrl: 'https://raw.githubusercontent.com/hirosystems/platform-template-post-conditions/refs/heads/main/README.md',
    previewPath: 'contracts/post-conditions.clar'
  }
];

export class HiroTemplateService {
  /**
   * Fetch the README content for a template
   */
  static async fetchReadme(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch README: ${url}`);
    }
    return await response.text();
  }

  /**
   * Fetch a specific file content from a repository
   */
  static async fetchFileContent(repoUrl: string, path: string): Promise<string> {
    // Convert GitHub repo URL to raw URL
    // e.g. https://github.com/hirosystems/platform-template-fungible-token -> https://raw.githubusercontent.com/hirosystems/platform-template-fungible-token/main/
    const baseUrl = repoUrl.replace('github.com', 'raw.githubusercontent.com') + '/main';
    const response = await fetch(`${baseUrl}/${path}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${path}`);
    }
    return await response.text();
  }

  /**
   * Fetch repository contents (files and folders)
   * This uses the GitHub API to list files
   */
  static async fetchRepoContents(repoUrl: string): Promise<Record<string, string>> {
    // Extract owner and repo from URL
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) throw new Error('Invalid repo URL');
    const owner = match[1];
    const repo = match[2];

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
    const files: Record<string, string> = {};

    const processItem = async (item: any) => {
      if (item.type === 'file') {
        const content = await (await fetch(item.download_url)).text();
        files[item.path] = content;
      } else if (item.type === 'dir') {
        const dirResponse = await fetch(item.url);
        const dirContents = await dirResponse.json();
        for (const subItem of dirContents) {
          await processItem(subItem);
        }
      }
    };

    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`GitHub API error: ${response.statusText}`);
    const contents = await response.json();

    for (const item of contents) {
      await processItem(item);
    }

    return files;
  }

  /**
   * Transform files to FileNodes
   */
  static templateToFileNodes(files: Record<string, string>, parentId: string = 'root'): FileNode[] {
    const nodes: FileNode[] = [];
    const fileMap: Record<string, FileNode> = {};

    for (const [path, content] of Object.entries(files)) {
      const parts = path.split('/');
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const pathKey = currentPath ? `${currentPath}/${part}` : part;

        if (!fileMap[pathKey]) {
          const isFile = i === parts.length - 1;
          const extension = isFile ? part.split('.').pop()?.toLowerCase() : undefined;
          const language = isFile ? this.getLanguageFromExtension(extension || '') : undefined;

          const node: FileNode = {
            id: `hiro-${pathKey}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: part,
            type: isFile ? 'file' : 'folder',
            content: isFile ? content : undefined,
            language,
            children: isFile ? undefined : []
          };

          fileMap[pathKey] = node;

          if (i === 0) {
            nodes.push(node);
          } else {
            const parentPath = parts.slice(0, i).join('/');
            const parent = fileMap[parentPath];
            if (parent && parent.children) {
              parent.children.push(node);
            }
          }
        }
        currentPath = pathKey;
      }
    }
    return nodes;
  }

  private static getLanguageFromExtension(ext: string): string {
    const langMap: Record<string, string> = {
      'clar': 'clarity',
      'rs': 'rust',
      'ts': 'typescript',
      'js': 'javascript',
      'toml': 'toml',
      'json': 'json',
      'md': 'markdown',
      'txt': 'plaintext'
    };
    return langMap[ext] || 'plaintext';
  }
}
