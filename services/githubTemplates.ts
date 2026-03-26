import { FileNode } from '../types';

export interface GitHubTemplate {
  id: string;
  name: string;
  description: string;
  path: string;
  previewPath?: string;
}

/**
 * Configure your GitHub repository here
 */
const CONFIG = {
  OWNER: 'LabSTX', // Replace with your GitHub username
  REPO: 'LabSTX-Workshops',
  BRANCH: 'main'
};

const BASE_API_URL = `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}`;
const BASE_RAW_URL = `https://raw.githubusercontent.com/${CONFIG.OWNER}/${CONFIG.REPO}/${CONFIG.BRANCH}`;

export class GitHubTemplateService {
  /**
   * Fetch the list of templates from templates.json
   */
  static async fetchTemplates(): Promise<GitHubTemplate[]> {
    try {
      const response = await fetch(`${BASE_RAW_URL}/templates.json`);
      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  }

  /**
   * Fetch the content of a specific file
   */
  static async fetchFileContent(path: string): Promise<string> {
    const response = await fetch(`${BASE_RAW_URL}/${path}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${path}`);
    }
    return await response.text();
  }

  /**
   * Fetch all files for a template recursively using the GitHub Data API
   */
  static async fetchTemplateFiles(templatePath: string): Promise<Record<string, string>> {
    try {
      // 1. Get the recursive tree for the repository
      // Optimization: We could just get the contents of the template folder if it's not too deep
      // But for a complete project, recursive is better.
      const response = await fetch(`${BASE_API_URL}/contents/${templatePath}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch template contents: ${templatePath}`);
      }

      const contents = await response.json();
      const files: Record<string, string> = {};

      const processItem = async (item: any, currentPath: string) => {
        if (item.type === 'file') {
          const content = await this.fetchFileContent(item.path);
          // Strip the template folder prefix from the path
          const relativePath = item.path.startsWith(templatePath + '/')
            ? item.path.substring(templatePath.length + 1)
            : item.path;
          files[relativePath] = content;
        } else if (item.type === 'dir') {
          const dirResponse = await fetch(item.url);
          const dirContents = await dirResponse.json();
          for (const subItem of dirContents) {
            await processItem(subItem, `${currentPath}/${subItem.name}`);
          }
        }
      };

      for (const item of contents) {
        await processItem(item, item.name);
      }

      return files;
    } catch (error) {
      console.error('Error fetching template files:', error);
      throw error;
    }
  }

  /**
   * Convert template files (Record<string, string>) to FileNode[]
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
            id: `${parentId}-${pathKey}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
