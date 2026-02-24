import { FileNode } from '../types';
import { helloWorldClarityExample } from '../examples/hello-world-clarity';
import { counterClarityExample } from '../examples/counter-clarity';
import { ftClarityExample } from '../examples/ft-clarity';

export interface Template {
  id: string;
  name: string;
  description: string;
  language: 'clarity' | 'markdown';
  files: Record<string, string>;
}

export const TEMPLATES: Template[] = [
  // === BASIC CONTRACTS ===
  {
    id: 'hello-world',
    name: '👋 Hello World',
    description: 'A basic Clarity contract that returns a greeting string',
    language: 'clarity',
    files: helloWorldClarityExample
  },
  {
    id: 'counter',
    name: '🔢 Counter',
    description: 'A stateful counter contract with increment, decrement, and get-counter functions',
    language: 'clarity',
    files: counterClarityExample
  },
  {
    id: 'fungible-token',
    name: '🪙 Fungible Token',
    description: 'A simple fungible token implementation (SIP-010-like)',
    language: 'clarity',
    files: ftClarityExample
  }
];

/**
 * Convert template files to FileNode structure
 */
export function templateToFileNodes(template: Template, parentId: string = 'root'): FileNode[] {
  const nodes: FileNode[] = [];
  const fileMap: Record<string, FileNode> = {};

  // Process each file in the template
  for (const [path, content] of Object.entries(template.files)) {
    const parts = path.split('/');
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!fileMap[currentPath]) {
        const isFile = i === parts.length - 1;
        const extension = isFile ? part.split('.').pop()?.toLowerCase() : undefined;
        const language = isFile ? getLanguageFromExtension(extension || '') : undefined;

        const node: FileNode = {
          id: `${parentId}-${currentPath}`,
          name: part,
          type: isFile ? 'file' : 'folder',
          content: isFile ? content : undefined,
          language,
          children: isFile ? undefined : []
        };

        fileMap[currentPath] = node;

        // Add to parent
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
    }
  }

  return nodes;
}

function getLanguageFromExtension(ext: string): string {
  const langMap: Record<string, string> = {
    'clar': 'clarity',
    'rs': 'rust',
    'ts': 'typescript',
    'as': 'typescript',
    'toml': 'toml',
    'json': 'json',
    'md': 'markdown',
    'txt': 'plaintext',
    'makefile': 'makefile'
  };
  return langMap[ext] || 'plaintext';
}

/**
 * Load a template by ID
 */
export function loadTemplate(templateId: string): Template | null {
  return TEMPLATES.find(t => t.id === templateId) || null;
}
