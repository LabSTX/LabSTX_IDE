import React, { useMemo } from 'react';
import { CopyIcon, DownloadIcon } from './Icons';

// ─── Tiny Markdown → HTML renderer (no dependencies) ─────────────────────────

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderInline(text: string): string {
    return text
        // Bold + Italic
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/_(.+?)_/g, '<em>$1</em>')
        // Strikethrough
        .replace(/~~(.+?)~~/g, '<del>$1</del>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>')
        // Images
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="md-img" />')
        // Auto-links
        .replace(/(?<![="])https?:\/\/[^\s<>)]+/g, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="md-link">${url}</a>`);
}

function renderMarkdown(md: string): string {
    const lines = md.split('\n');
    const out: string[] = [];
    let i = 0;

    while (i < lines.length) {
        const raw = lines[i];
        const line = raw;

        // ── Fenced code block ──────────────────────────────────────
        const fenceMatch = line.match(/^(`{3,}|~{3,})([\w-]*)/);
        if (fenceMatch) {
            const fence = fenceMatch[1];
            const lang = fenceMatch[2] || '';
            i++;
            const codeLines: string[] = [];
            while (i < lines.length && !lines[i].startsWith(fence)) {
                codeLines.push(escapeHtml(lines[i]));
                i++;
            }
            i++; // consume closing fence
            const langLabel = lang ? `<span class="md-code-lang">${escapeHtml(lang)}</span>` : '';
            out.push(`<div class="md-code-block-wrap">${langLabel}<pre class="md-code-block"><code>${codeLines.join('\n')}</code></pre></div>`);
            continue;
        }

        // ── Headings ───────────────────────────────────────────────
        const h6 = line.match(/^#{6}\s+(.*)/);
        const h5 = line.match(/^#{5}\s+(.*)/);
        const h4 = line.match(/^#{4}\s+(.*)/);
        const h3 = line.match(/^#{3}\s+(.*)/);
        const h2 = line.match(/^#{2}\s+(.*)/);
        const h1 = line.match(/^#{1}\s+(.*)/);
        if (h6) { out.push(`<h6 class="md-h6">${renderInline(h6[1])}</h6>`); i++; continue; }
        if (h5) { out.push(`<h5 class="md-h5">${renderInline(h5[1])}</h5>`); i++; continue; }
        if (h4) { out.push(`<h4 class="md-h4">${renderInline(h4[1])}</h4>`); i++; continue; }
        if (h3) { out.push(`<h3 class="md-h3">${renderInline(h3[1])}</h3>`); i++; continue; }
        if (h2) { out.push(`<h2 class="md-h2">${renderInline(h2[1])}</h2>`); i++; continue; }
        if (h1) { out.push(`<h1 class="md-h1">${renderInline(h1[1])}</h1>`); i++; continue; }

        // ── Setext-style headings ──────────────────────────────────
        if (i + 1 < lines.length) {
            if (/^=+$/.test(lines[i + 1].trim()) && line.trim()) {
                out.push(`<h1 class="md-h1">${renderInline(escapeHtml(line))}</h1>`);
                i += 2; continue;
            }
            if (/^-+$/.test(lines[i + 1].trim()) && line.trim() && !line.startsWith('-')) {
                out.push(`<h2 class="md-h2">${renderInline(escapeHtml(line))}</h2>`);
                i += 2; continue;
            }
        }

        // ── Horizontal rule ────────────────────────────────────────
        if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
            out.push('<hr class="md-hr" />');
            i++; continue;
        }

        // ── Blockquote ─────────────────────────────────────────────
        if (line.startsWith('> ') || line === '>') {
            const bqLines: string[] = [];
            while (i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>')) {
                bqLines.push(lines[i].replace(/^> ?/, ''));
                i++;
            }
            out.push(`<blockquote class="md-blockquote">${renderMarkdown(bqLines.join('\n'))}</blockquote>`);
            continue;
        }

        // ── Unordered list ─────────────────────────────────────────
        if (/^(\s*)([-*+])\s+/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^(\s*)([-*+])\s+/.test(lines[i])) {
                const m = lines[i].match(/^(\s*)([-*+])\s+(.*)/);
                if (m) {
                    // Check for task list items
                    const taskMatch = m[3].match(/^\[([ xX])\]\s+(.*)/);
                    if (taskMatch) {
                        const checked = taskMatch[1].toLowerCase() === 'x';
                        items.push(`<li class="md-task-item"><input type="checkbox" ${checked ? 'checked' : ''} disabled class="md-checkbox" /><span>${renderInline(escapeHtml(taskMatch[2]))}</span></li>`);
                    } else {
                        items.push(`<li class="md-li">${renderInline(escapeHtml(m[3]))}</li>`);
                    }
                }
                i++;
            }
            out.push(`<ul class="md-ul">${items.join('')}</ul>`);
            continue;
        }

        // ── Ordered list ───────────────────────────────────────────
        if (/^\d+\.\s+/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
                const m = lines[i].match(/^\d+\.\s+(.*)/);
                if (m) items.push(`<li class="md-li">${renderInline(escapeHtml(m[1]))}</li>`);
                i++;
            }
            out.push(`<ol class="md-ol">${items.join('')}</ol>`);
            continue;
        }

        // ── Table ──────────────────────────────────────────────────
        if (line.includes('|') && i + 1 < lines.length && /^\|?[-:\s|]+\|?$/.test(lines[i + 1])) {
            const headerCells = line.split('|').map(c => c.trim()).filter(c => c);
            i++; // skip separator
            const aligns = lines[i].split('|').map(c => c.trim()).filter(c => c).map(c => {
                if (c.startsWith(':') && c.endsWith(':')) return 'center';
                if (c.endsWith(':')) return 'right';
                return 'left';
            });
            i++;
            const rows: string[][] = [];
            while (i < lines.length && lines[i].includes('|')) {
                rows.push(lines[i].split('|').map(c => c.trim()).filter(c => c));
                i++;
            }
            const thead = `<thead><tr>${headerCells.map((c, ci) => `<th class="md-th" style="text-align:${aligns[ci] || 'left'}">${renderInline(escapeHtml(c))}</th>`).join('')}</tr></thead>`;
            const tbody = rows.map(r => `<tr>${r.map((c, ci) => `<td class="md-td" style="text-align:${aligns[ci] || 'left'}">${renderInline(escapeHtml(c))}</td>`).join('')}</tr>`).join('');
            out.push(`<div class="md-table-wrap"><table class="md-table">${thead}<tbody>${tbody}</tbody></table></div>`);
            continue;
        }

        // ── Blank line → paragraph break ──────────────────────────
        if (!line.trim()) {
            out.push('<div class="md-spacer"></div>');
            i++; continue;
        }

        // ── Paragraph ─────────────────────────────────────────────
        const paraLines: string[] = [];
        while (
            i < lines.length &&
            lines[i].trim() &&
            !lines[i].match(/^#{1,6}\s/) &&
            !lines[i].match(/^(`{3,}|~{3,})/) &&
            !lines[i].match(/^(\s*)([-*+])\s+/) &&
            !lines[i].match(/^\d+\.\s+/) &&
            !lines[i].startsWith('> ') &&
            !/^(\*{3,}|-{3,}|_{3,})$/.test(lines[i].trim())
        ) {
            paraLines.push(lines[i]);
            i++;
        }
        if (paraLines.length > 0) {
            out.push(`<p class="md-p">${renderInline(escapeHtml(paraLines.join('\n')))}</p>`);
        }
    }

    return out.join('\n');
}

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

            {/* ── Inline styles ── */}
            <style>{`
                /* ── Markdown Preview Styles ── */
                .md-preview {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif;
                    font-size: 15px;
                    line-height: 1.75;
                    word-break: break-word;
                }

                /* Headings */
                .md-preview .md-h1 {
                    font-size: 2em;
                    font-weight: 900;
                    letter-spacing: -0.02em;
                    margin: 0.6em 0 0.4em;
                    padding-bottom: 0.3em;
                    border-bottom: 2px solid;
                }
                .md-preview .md-h2 {
                    font-size: 1.5em;
                    font-weight: 800;
                    margin: 1.2em 0 0.5em;
                    padding-bottom: 0.25em;
                    border-bottom: 1px solid;
                }
                .md-preview .md-h3 { font-size: 1.25em; font-weight: 700; margin: 1em 0 0.4em; }
                .md-preview .md-h4 { font-size: 1.1em;  font-weight: 700; margin: 0.8em 0 0.3em; }
                .md-preview .md-h5 { font-size: 1em;    font-weight: 700; margin: 0.8em 0 0.3em; }
                .md-preview .md-h6 { font-size: 0.9em;  font-weight: 700; margin: 0.8em 0 0.3em; opacity: 0.75; }

                /* Dark theme headings */
                .md-preview.dark .md-h1,
                .md-preview.dark .md-h2,
                .md-preview.dark .md-h3,
                .md-preview.dark .md-h4,
                .md-preview.dark .md-h5,
                .md-preview.dark .md-h6 { color: #fff; }
                .md-preview.dark .md-h1 { border-color: #f7592b40; }
                .md-preview.dark .md-h2 { border-color: #ffffff20; }

                /* Light theme headings */
                .md-preview.light .md-h1,
                .md-preview.light .md-h2,
                .md-preview.light .md-h3,
                .md-preview.light .md-h4,
                .md-preview.light .md-h5,
                .md-preview.light .md-h6 { color: #1a1a2e; }
                .md-preview.light .md-h1 { border-color: #e2e8f0; }
                .md-preview.light .md-h2 { border-color: #e2e8f0; }

                /* Paragraph */
                .md-preview .md-p {
                    margin: 0.5em 0;
                    white-space: pre-wrap;
                }
                .md-preview.dark .md-p  { color: #c9d1d9; }
                .md-preview.light .md-p { color: #374151; }

                .md-preview .md-spacer { height: 0.5em; }

                /* Inline code */
                .md-preview .md-inline-code {
                    font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
                    font-size: 0.875em;
                    padding: 0.15em 0.45em;
                    border-radius: 4px;
                }
                .md-preview.dark  .md-inline-code { background: #1e2030; color: #f7592b; border: 1px solid #ffffff15; }
                .md-preview.light .md-inline-code { background: #f3f4f6; color: #e53e3e; border: 1px solid #e2e8f0; }

                /* Code block */
                .md-code-block-wrap {
                    position: relative;
                    margin: 1em 0;
                    border-radius: 10px;
                    overflow: hidden;
                    border: 1px solid;
                }
                .md-preview.dark  .md-code-block-wrap { border-color: #ffffff15; background: #161b22; }
                .md-preview.light .md-code-block-wrap { border-color: #e2e8f0;   background: #f8fafc; }

                .md-code-lang {
                    display: block;
                    font-family: monospace;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    padding: 6px 14px 5px;
                    border-bottom: 1px solid;
                }
                .md-preview.dark  .md-code-lang { color: #f7592b; background: #0d1117; border-color: #ffffff12; }
                .md-preview.light .md-code-lang { color: #6366f1; background: #f1f5f9; border-color: #e2e8f0; }

                .md-code-block {
                    margin: 0;
                    padding: 16px;
                    font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
                    font-size: 13px;
                    line-height: 1.6;
                    overflow-x: auto;
                    tab-size: 2;
                }
                .md-preview.dark  .md-code-block { color: #e6edf3; }
                .md-preview.light .md-code-block { color: #1e293b; }

                /* Blockquote */
                .md-blockquote {
                    margin: 0.75em 0;
                    padding: 0.5em 1em;
                    border-left: 3px solid;
                    border-radius: 0 6px 6px 0;
                }
                .md-preview.dark  .md-blockquote { border-color: #f7592b; background: #f7592b0a; color: #8b949e; }
                .md-preview.light .md-blockquote { border-color: #6366f1; background: #f5f3ff;   color: #6b7280; }

                /* Lists */
                .md-ul, .md-ol { margin: 0.6em 0; padding-left: 1.75em; }
                .md-li { margin: 0.2em 0; }
                .md-preview.dark  .md-li { color: #c9d1d9; }
                .md-preview.light .md-li { color: #374151; }

                /* Task list */
                .md-task-item { display: flex; align-items: flex-start; gap: 0.5em; list-style: none; margin-left: -1.75em; }
                .md-checkbox { margin-top: 0.3em; flex-shrink: 0; accent-color: #f7592b; }

                /* Horizontal rule */
                .md-hr { border: none; height: 2px; margin: 1.5em 0; border-radius: 1px; }
                .md-preview.dark  .md-hr { background: #ffffff15; }
                .md-preview.light .md-hr { background: #e2e8f0; }

                /* Links */
                .md-link {
                    text-decoration: underline;
                    text-underline-offset: 2px;
                    transition: opacity 0.15s;
                }
                .md-link:hover { opacity: 0.75; }
                .md-preview.dark  .md-link { color: #58a6ff; }
                .md-preview.light .md-link { color: #2563eb; }

                /* Images */
                .md-img {
                    max-width: 100%;
                    border-radius: 8px;
                    margin: 0.5em 0;
                    display: block;
                }

                /* Tables */
                .md-table-wrap { overflow-x: auto; margin: 1em 0; border-radius: 8px; border: 1px solid; }
                .md-preview.dark  .md-table-wrap { border-color: #ffffff15; }
                .md-preview.light .md-table-wrap { border-color: #e2e8f0; }

                .md-table { width: 100%; border-collapse: collapse; font-size: 0.9em; }

                .md-th {
                    padding: 8px 14px;
                    font-weight: 700;
                    font-size: 0.8em;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    border-bottom: 1px solid;
                }
                .md-preview.dark  .md-th { background: #161b22; color: #f7592b; border-color: #ffffff15; }
                .md-preview.light .md-th { background: #f8fafc; color: #6366f1; border-color: #e2e8f0; }

                .md-td { padding: 7px 14px; border-bottom: 1px solid; }
                .md-preview.dark  .md-td { color: #c9d1d9; border-color: #ffffff0a; }
                .md-preview.light .md-td { color: #374151; border-color: #f1f5f9; }

                tr:last-child .md-td { border-bottom: none; }
                .md-preview.dark  tr:nth-child(even) { background: #ffffff04; }
                .md-preview.light tr:nth-child(even) { background: #f8fafc; }

                /* strong / em / del */
                .md-preview strong { font-weight: 700; }
                .md-preview.dark  strong { color: #fff; }
                .md-preview.light strong { color: #111827; }
                .md-preview em { font-style: italic; }
                .md-preview del { text-decoration: line-through; opacity: 0.6; }
            `}</style>
        </div>
    );
};

export default MarkdownPreviewTab;
