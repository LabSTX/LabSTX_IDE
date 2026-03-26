/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_COMPILER_SERVICE_URL?: string;
    readonly GEMINI_API_KEY?: string;
    readonly VITE_OPENROUTER_API_KEY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

interface Navigator {
    usb?: any;
}
