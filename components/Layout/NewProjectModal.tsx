
import React from 'react';
import { XIcon, PlusIcon, UploadIcon, SmartFileIcon } from '../UI/Icons';
import { TEMPLATES } from '../../services/templates';

interface NewProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoadTemplate: (templateId: string) => void;
    onCreateBlank: () => void;
    onImport: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
    isOpen,
    onClose,
    onLoadTemplate,
    onCreateBlank,
    onImport
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-caspier-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className="bg-caspier-dark border-2 border-caspier-border w-full max-w-2xl rounded-2xl shadow-[8px_8px_0_0_rgba(0,123,255,0.2)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
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
                <div className="p-8 overflow-y-auto max-h-[70vh] bg-caspier-dark/50">
                    {/* Main Actions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                        <button
                            onClick={() => { onCreateBlank(); onClose(); }}
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
                            onClick={() => { onImport(); onClose(); }}
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
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[10px] font-black  uppercase tracking-[0.3em]">Starter Templates</h3>
                            <div className="h-[2px] flex-1 bg-caspier-border ml-6" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {TEMPLATES.map((template) => (
                                <button
                                    key={template.id}
                                    onClick={() => { onLoadTemplate(template.id); onClose(); }}
                                    className="flex flex-col p-5 bg-caspier-black/50 hover:bg-caspier-black border-2 border-caspier-border hover:border-labstx-orange transition-all rounded-xl group text-left h-full hover:shadow-[4px_4px_0_0_rgba(0,123,255,0.4)]"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-caspier-dark border border-caspier-border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                        <SmartFileIcon name={template.id + ".clar"} className="w-6 h-6" />
                                    </div>
                                    <div className=" font-bold text-sm mb-2 group-hover:text-labstx-orange transition-colors">{template.name}</div>
                                    <div className="text-caspier-muted text-[11px] leading-relaxed font-medium">{template.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-caspier-black border-t-2 border-caspier-border flex items-center justify-between">
                    <span className="text-[9px] text-caspier-muted uppercase tracking-[0.2em] font-black">LabSTX Professional Edition</span>
                    <button
                        onClick={onClose}
                        className="text-[10px] font-black text-labstx-orange uppercase tracking-widest hover:underline"
                    >
                        Back to Editor
                    </button>
                </div>
            </div>
        </div>
    );
};
