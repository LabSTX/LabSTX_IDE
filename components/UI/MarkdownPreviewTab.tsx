import React, { useMemo } from 'react';
import { CopyIcon, DownloadIcon } from './Icons';

import { renderMarkdown } from '../../utils/markdownUtils';

// ─── Component ────────────────────────────────────────────────────────────────

interface MarkdownPreviewTabProps {
    content: string;
    fileName: string;
    theme: 'dark' | 'light';
}

const MarkdownPreviewTab: React.FC<MarkdownPreviewTabProps> = ({ content, fileName, theme }) => {
    const [copied, setCopied] = React.useState(false);

    const html = useMemo(() => renderMarkdown(content), [content]);

    const isDark = theme === 'dark';

    const copy = () => {
        navigator.clipboard.writeText(content).catch(() => { });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const download = () => {
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className={`h-full flex flex-col overflow-hidden ${isDark ? 'bg-caspier-dark text-caspier-text' : 'bg-[#fafafa] text-gray-900'}`}>

            {/* ── Toolbar ── */}
            <div className={`flex-shrink-0 flex items-center justify-between px-5 py-2.5 border-b ${isDark ? 'border-caspier-border bg-caspier-black/60' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center gap-3">
                    {/* Markdown icon */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-blue-400">
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                            <path d="M7 15V9l3 3 3-3v6" />
                            <path d="M17 9v6" />
                            <path d="M14 12h6" />
                        </svg>
                    </div>
                    <div>
                        <span className={`font-bold text-sm ${isDark ? 'text-caspier-text' : 'text-gray-800'}`}>
                            Markdown Preview
                        </span>
                        <span className={`ml-2 text-[11px] font-mono ${isDark ? 'text-caspier-muted' : 'text-gray-400'}`}>
                            {fileName}
                        </span>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${isDark ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-500 border border-blue-200'}`}>
                        MD
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {copied && (
                        <span className="text-[11px] text-green-400 font-semibold animate-in fade-in duration-200">
                            Copied!
                        </span>
                    )}
                    <button
                        onClick={copy}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${isDark ? 'border-caspier-border hover:border-blue-400/50 text-caspier-muted hover:text-blue-400' : 'border-gray-200 hover:border-blue-400 text-gray-500 hover:text-blue-500'}`}
                    >
                        <CopyIcon className="w-3.5 h-3.5" />
                        Copy source
                    </button>
                    <button
                        onClick={download}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${isDark ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 border-blue-200 text-blue-500 hover:bg-blue-100'}`}
                    >
                        <DownloadIcon className="w-3.5 h-3.5" />
                        Download
                    </button>
                </div>
            </div>

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto">
                {!content.trim() ? (
                    <div className={`flex flex-col items-center justify-center h-full gap-3 ${isDark ? 'text-caspier-muted' : 'text-gray-400'}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 opacity-20">
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                            <path d="M7 15V9l3 3 3-3v6M17 9v6M14 12h6" />
                        </svg>
                        <p className="text-sm">This markdown file is empty.</p>
                    </div>
                ) : (
                    <div
                        className={`md-preview mx-auto px-8 py-10 max-w-4xl ${isDark ? 'dark' : 'light'}`}
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                )}
            </div>

        </div>
    );
};

export default MarkdownPreviewTab;
