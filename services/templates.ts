import { FileNode } from '../types';

/**
 * Convert a flat Record of path -> content to FileNode structure
 * This is used for server-side file sync and general purpose file tree building.
 */
export function filesToFileNodes(files: Record<string, string>, parentId: string = 'root', existingNodes?: FileNode[]): FileNode[] {
  const nodes: FileNode[] = [];
  const fileMap: Record<string, FileNode> = {};

  const oldPathToId: Record<string, string> = {};
  if (existingNodes) {
    const traverse = (ns: FileNode[], prefix: string = '') => {
      for (const n of ns) {
        const currentPath = prefix ? `${prefix}/${n.name}` : n.name;
        oldPathToId[currentPath] = n.id;
        if (n.children) traverse(n.children, currentPath);
      }
    };
    traverse(existingNodes);
  }

  // Process each file
  for (const [path, content] of Object.entries(files)) {
    const parts = path.split('/');
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const pathKey = currentPath ? `${currentPath}/${part}` : part;

      if (!fileMap[pathKey]) {
        const isFile = i === parts.length - 1;
        const extension = isFile ? part.split('.').pop()?.toLowerCase() : undefined;
        const language = isFile ? getLanguageFromExtension(extension || '') : undefined;
        const existingId = oldPathToId[pathKey];

        const node: FileNode = {
          id: existingId || `${parentId}-${pathKey}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: part,
          type: isFile ? 'file' : 'folder',
          content: isFile ? content : undefined,
          language,
          children: isFile ? undefined : []
        };

        fileMap[pathKey] = node;

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
      currentPath = pathKey;
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
