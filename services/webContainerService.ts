import { WebContainer } from '@webcontainer/api';

/**
 * Singleton service for managing the WebContainer instance.
 */
class WebContainerService {
    private static instance: WebContainerService;
    private webcontainerInstance: WebContainer | null = null;
    private initializationPromise: Promise<WebContainer> | null = null;

    private constructor() { }

    public static getInstance(): WebContainerService {
        if (!WebContainerService.instance) {
            WebContainerService.instance = new WebContainerService();
        }
        return WebContainerService.instance;
    }

    public async boot(): Promise<WebContainer> {
        if (this.webcontainerInstance) {
            return this.webcontainerInstance;
        }

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = (async () => {
            try {
                this.webcontainerInstance = await WebContainer.boot();
                return this.webcontainerInstance;
            } catch (error) {
                this.initializationPromise = null;
                throw error;
            }
        })();

        return this.initializationPromise;
    }

    public getWebContainer(): WebContainer | null {
        return this.webcontainerInstance;
    }

    /**
     * Mounts files into the WebContainer.
     * Expects files in the format: { [path: string]: { file: { contents: string | Uint8Array } } | { directory: { [path: string]: ... } } }
     */
    public async mountFiles(files: any) {
        if (!this.webcontainerInstance) throw new Error('WebContainer not booted');
        await this.webcontainerInstance.mount(files);
    }

    public async writeFile(path: string, contents: string) {
        if (!this.webcontainerInstance) return;
        await this.webcontainerInstance.fs.writeFile(path, contents);
    }
}

export const webContainerService = WebContainerService.getInstance();
