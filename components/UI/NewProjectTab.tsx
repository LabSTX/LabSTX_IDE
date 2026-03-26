
import React from 'react';
import { XIcon, PlusIcon, UploadIcon, SmartFileIcon, PlayIcon, CopyIcon, EyeIcon, CodeIcon, RefreshIcon } from '../UI/Icons';
import { GitHubTemplateService, GitHubTemplate } from '../../services/githubTemplates';
import { FileNode } from '../../types';

interface NewProjectTabProps {
    onLoadTemplate: (nodes: FileNode[], templateName?: string) => void;
    onCreateBlank: () => void;
    onImport: () => void;
    onClose: () => void;
}

export const NewProjectTab: React.FC<NewProjectTabProps> = ({
    onLoadTemplate,
    onCreateBlank,
    onImport,
    onClose
}) => {
    const [templates, setTemplates] = React.useState<GitHubTemplate[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [loadingFilesId, setLoadingFilesId] = React.useState<string | null>(null);

    const [previewCode, setPreviewCode] = React.useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = React.useState<string>('');

    React.useEffect(() => {
        const loadTemplates = async () => {
            try {
                setLoading(true);
                const data = await GitHubTemplateService.fetchTemplates();
                setTemplates(data);
                setError(null);
            } catch (err) {
                console.error('Failed to load templates:', err);
                setError('Failed to load templates from GitHub. Please check your connection.');
            } finally {
                setLoading(false);
            }
        };
        loadTemplates();
    }, []);

    const handleCopyLink = (templateId: string) => {
        const baseUrl = window.location.origin + window.location.pathname;
        const deepLink = `${baseUrl}?template_id=${templateId}`;
        navigator.clipboard.writeText(deepLink);
    };

    const handlePreview = async (template: GitHubTemplate) => {
        if (!template.previewPath) return;

        try {
            setLoadingFilesId(template.id);
            const content = await GitHubTemplateService.fetchFileContent(template.previewPath);
            setPreviewCode(content);
            setPreviewTitle(template.name);
        } catch (err) {
            console.error('Failed to load preview:', err);
        } finally {
            setLoadingFilesId(null);
        }
    };

    const handleOpenTemplate = async (template: GitHubTemplate) => {
        try {
            setLoadingFilesId(template.id);
            const files = await GitHubTemplateService.fetchTemplateFiles(template.path);
            const nodes = GitHubTemplateService.templateToFileNodes(files);
            onLoadTemplate(nodes, template.name);
        } catch (err) {
            console.error('Failed to load template files:', err);
            alert('Failed to load template files. Please try again.');
        } finally {
            setLoadingFilesId(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-caspier-dark animate-in fade-in duration-300">
            {/* Header */}
            <div className="p-8 border-b-2 border-caspier-border flex justify-between items-center bg-caspier-black">
                <div>
                    <h2 className="text-2xl font-black tracking-widest uppercase ">New Project</h2>
                    <p className="text-caspier-muted text-[10px] mt-2 font-black uppercase tracking-[0.2em]">Select your starting point</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-labstx-orange hover:text-white rounded-full text-caspier-muted transition-all border-2 border-transparent hover:border-white/20"
                >
                    <XIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-8 overflow-y-auto bg-caspier-dark/50">
                <div className=" mx-auto">
                    {/* Main Actions Grid */}
                    <div className="hidden grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                        <button
                            onClick={() => { onCreateBlank(); }}
                            className="flex items-center gap-5 p-6 bg-caspier-black hover:bg-caspier-hover border-2 border-caspier-border hover:border-labstx-orange transition-all rounded-2xl group text-left shadow-none hover:shadow-[4px_4px_0_0_#007bff] relative overflow-hidden"
                        >
                            <div className="w-14 h-14 rounded-full bg-labstx-orange/10 flex items-center justify-center text-labstx-orange group-hover:bg-labstx-orange group-hover:text-white transition-all duration-300">
                                <PlusIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <div className="font-black text-lg uppercase tracking-tight">Blank Project</div>
                                <div className="text-caspier-muted text-[11px] font-medium mt-0.5">Start with a clean slate</div>
                            </div>
                        </button>

                        <button
                            onClick={() => { onImport(); }}
                            className="flex items-center gap-5 p-6 bg-caspier-black hover:bg-caspier-hover border-2 border-caspier-border hover:border-labstx-orange transition-all rounded-2xl group text-left shadow-none hover:shadow-[4px_4px_0_0_#007bff] relative overflow-hidden"
                        >
                            <div className="w-14 h-14 rounded-full bg-labstx-orange/10 flex items-center justify-center text-labstx-orange group-hover:bg-labstx-orange group-hover:text-white transition-all duration-300">
                                <UploadIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <div className=" font-black text-lg uppercase tracking-tight">Import Project</div>
                                <div className="text-caspier-muted text-[11px] font-medium mt-0.5">Load from local disk</div>
                            </div>
                        </button>
                    </div>

                    {/* Templates Section */}
                    <div className='w-full'>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[10px] font-black  uppercase tracking-[0.3em]">Starter Templates (Dynamic from GitHub)</h3>
                            <div className="h-[2px] flex-1 bg-caspier-border ml-6" />
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-caspier-muted">
                                <RefreshIcon className="w-10 h-10 animate-spin mb-4" />
                                <p className="text-xs uppercase tracking-widest font-bold">Loading templates...</p>
                            </div>
                        ) : error ? (
                            <div className="p-10 text-center bg-red-500/10 border-2 border-red-500/20 rounded-2xl">
                                <p className="text-red-500 text-sm font-bold mb-4">{error}</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-6 py-2 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                {templates.map((template) => (
                                    <div
                                        key={template.id}
                                        className="flex flex-col p-5 bg-caspier-black/50 border-2 border-caspier-border hover:border-labstx-orange transition-all rounded-xl group text-left h-full hover:shadow-[4px_4px_0_0_rgba(0,123,255,0.4)]"
                                    >
                                        <div className="flex-1">
                                            <div className="w-12 h-12 rounded-xl bg-caspier-dark border border-caspier-border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                                <SmartFileIcon name={template.id + ".clar"} className="w-6 h-6" />
                                            </div>
                                            <div className=" font-bold text-sm mb-2 group-hover:text-labstx-orange transition-colors uppercase tracking-tight">{template.name}</div>
                                            <div className="text-caspier-muted text-[11px] leading-relaxed font-medium mb-4">{template.description}</div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="grid grid-cols-2 gap-2 pt-4 border-t border-caspier-border/30 mt-auto">
                                            <button
                                                onClick={() => handleOpenTemplate(template)}
                                                disabled={loadingFilesId === template.id}
                                                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-labstx-orange/10 hover:bg-labstx-orange text-labstx-orange hover:text-white rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider border border-labstx-orange/20 disabled:opacity-50"
                                            >
                                                {loadingFilesId === template.id ? <RefreshIcon className="w-3 h-3 animate-spin" /> : <PlayIcon className="w-3 h-3" />}
                                                <span>Open</span>
                                            </button>
                                            <button
                                                onClick={() => handleCopyLink(template.id)}
                                                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-caspier-dark hover:bg-caspier-hover text-caspier-muted hover:text-caspier-white rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider border border-caspier-border"
                                            >
                                                <CopyIcon className="w-3 h-3" />
                                                <span>Link</span>
                                            </button>
                                            <button
                                                onClick={() => handlePreview(template)}
                                                disabled={loadingFilesId === template.id}
                                                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-caspier-dark hover:bg-caspier-hover text-caspier-muted hover:text-caspier-white rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider border border-caspier-border disabled:opacity-50"
                                            >
                                                {loadingFilesId === template.id ? <RefreshIcon className="w-3 h-3 animate-spin" /> : <EyeIcon className="w-3 h-3" />}
                                                <span>Preview</span>
                                            </button>
                                            <button
                                                disabled
                                                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-caspier-dark/50 text-caspier-muted/50 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-caspier-border cursor-not-allowed"
                                            >
                                                <CodeIcon className="w-3 h-3" />
                                                <span>Source</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="hidden p-6 bg-caspier-black border-t-2 border-caspier-border flex items-center justify-between">
                <span className="text-[9px] text-caspier-muted uppercase tracking-[0.2em] font-black">LabSTX Professional Edition</span>
                <button
                    onClick={onClose}
                    className="text-[10px] font-black text-labstx-orange uppercase tracking-widest hover:underline"
                >
                    Back to Editor
                </button>
            </div>
            {/* Preview Modal */}
            {previewCode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-caspier-dark border-2 border-caspier-border rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden scale-in-95 animate-in">
                        <div className="p-4 border-b border-caspier-border flex justify-between items-center bg-caspier-black">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-labstx-orange" />
                                <h3 className="font-black uppercase tracking-widest text-xs">Preview: {previewTitle}</h3>
                            </div>
                            <button
                                onClick={() => setPreviewCode(null)}
                                className="p-2 hover:bg-caspier-hover rounded-full transition-colors"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-6 bg-caspier-black/30">
                            <pre className="text-xs font-mono text-caspier-white leading-relaxed whitespace-pre-wrap">
                                {previewCode}
                            </pre>
                        </div>
                        <div className="p-4 border-t border-caspier-border bg-caspier-black flex justify-end">
                            <button
                                onClick={() => setPreviewCode(null)}
                                className="px-6 py-2 bg-labstx-orange text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-labstx-orange/80 transition-all"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
