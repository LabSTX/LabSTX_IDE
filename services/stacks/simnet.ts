import { initSimnet } from '@stacks/clarinet-sdk-browser';

let simnetInstance: any = null;

export async function getSimnet() {
    if (!simnetInstance) {
        simnetInstance = await initSimnet();
    }
    return simnetInstance;
}
