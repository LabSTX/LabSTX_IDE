// ─── Tiny Markdown → HTML renderer (no dependencies) ─────────────────────────

export function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function renderInline(text: string): string {
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

export function renderMarkdown(md: string): string {
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
