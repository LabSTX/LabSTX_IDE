import { GitState, GitCommit } from '../types';

export class GitService {
    static async getStatus(): Promise<Partial<GitState>> {
        const response = await fetch('/api/git/status');
        if (!response.ok) throw new Error('Failed to fetch git status');
        const data = await response.json();
        return {
            branch: data.branch,
            modifiedFiles: data.modifiedFiles,
            stagedFiles: data.stagedFiles
        };
    }

    static async getLog(): Promise<GitCommit[]> {
        const response = await fetch('/api/git/log');
        if (!response.ok) throw new Error('Failed to fetch git log');
        const data = await response.json();
        return data.commits;
    }

    static async stageFile(filePath: string): Promise<void> {
        const response = await fetch('/api/git/stage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath })
        });
        if (!response.ok) throw new Error('Failed to stage file');
    }

    static async unstageFile(filePath: string): Promise<void> {
        const response = await fetch('/api/git/unstage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath })
        });
        if (!response.ok) throw new Error('Failed to unstage file');
    }

    static async discardFile(filePath: string): Promise<void> {
        const response = await fetch('/api/git/discard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath })
        });
        if (!response.ok) throw new Error('Failed to discard changes');
    }

    static async commit(message: string): Promise<void> {
        const response = await fetch('/api/git/commit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        if (!response.ok) throw new Error('Failed to commit');
    }

    static async getBranches(): Promise<string[]> {
        const response = await fetch('/api/git/branches');
        if (!response.ok) throw new Error('Failed to fetch branches');
        const data = await response.json();
        return data.branches;
    }

    static async checkout(branch: string, create: boolean = false): Promise<void> {
        const response = await fetch('/api/git/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ branch, create })
        });
        if (!response.ok) throw new Error('Failed to checkout branch');
    }
}
