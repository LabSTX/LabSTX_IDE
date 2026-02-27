
import React, { useState } from 'react';
import { XIcon, BugIcon, GithubIcon, SendIcon } from './Icons';
import { Button } from './Button';

interface BugReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    theme: 'dark' | 'light';
}

export const BugReportModal: React.FC<BugReportModalProps> = ({ isOpen, onClose, theme }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [steps, setSteps] = useState('');
    const [expected, setExpected] = useState('');
    const [actual, setActual] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate report submission
        const issueBody = `
## Bug Description
${description}

## Steps to Reproduce
${steps}

## Expected Behavior
${expected}

## Actual Behavior
${actual}

---
*Reported via LabSTX IDE*
    `;

        console.log('Bug Report Submitted:', { title, body: issueBody });

        // In a real app, this might open a GitHub issue or send to a backend
        // For now, let's just simulate a success and close
        setTimeout(() => {
            setIsSubmitting(false);
            alert('Thank you for your report! In a production environment, this would be submitted to our issue tracker.');
            onClose();
        }, 1000);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className={`w-full max-w-2xl mx-4 overflow-hidden rounded-xl border shadow-2xl transition-all scale-in-center ${theme === 'dark'
                        ? 'bg-[#1a1a1a] border-caspier-border text-caspier-text'
                        : 'bg-white border-gray-200 text-gray-800'
                    }`}
            >
                {/* Header */}
                <div className={`px-6 py-4 flex items-center justify-between border-b ${theme === 'dark' ? 'border-caspier-border bg-caspier-black' : 'border-gray-100 bg-gray-50'
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 rounded-lg">
                            <BugIcon className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold tracking-tight">Report an Issue</h2>
                            <p className="text-xs text-caspier-muted font-medium">Help us improve LabSTX by sharing your feedback</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-caspier-hover rounded-full transition-colors text-caspier-muted"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-caspier-muted">Issue Title</label>
                        <input
                            required
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="A brief, descriptive summary of the problem"
                            className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all focus:ring-2 focus:ring-labstx-orange/20 ${theme === 'dark'
                                    ? 'bg-caspier-dark border-caspier-border text-caspier-text focus:border-labstx-orange'
                                    : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-labstx-orange'
                                }`}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-caspier-muted">Description</label>
                        <textarea
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What happened? Please be as detailed as possible."
                            rows={3}
                            className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all focus:ring-2 focus:ring-labstx-orange/20 resize-none ${theme === 'dark'
                                    ? 'bg-caspier-dark border-caspier-border text-caspier-text focus:border-labstx-orange'
                                    : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-labstx-orange'
                                }`}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-caspier-muted">Expected Behavior</label>
                            <textarea
                                value={expected}
                                onChange={(e) => setExpected(e.target.value)}
                                placeholder="What did you expect to happen?"
                                rows={3}
                                className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all focus:ring-2 focus:ring-labstx-orange/20 resize-none ${theme === 'dark'
                                        ? 'bg-caspier-dark border-caspier-border text-caspier-text focus:border-labstx-orange'
                                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-labstx-orange'
                                    }`}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-caspier-muted">Actual Behavior</label>
                            <textarea
                                value={actual}
                                onChange={(e) => setActual(e.target.value)}
                                placeholder="What actually happened?"
                                rows={3}
                                className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all focus:ring-2 focus:ring-labstx-orange/20 resize-none ${theme === 'dark'
                                        ? 'bg-caspier-dark border-caspier-border text-caspier-text focus:border-labstx-orange'
                                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-labstx-orange'
                                    }`}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-caspier-muted">Steps to Reproduce</label>
                        <textarea
                            value={steps}
                            onChange={(e) => setSteps(e.target.value)}
                            placeholder="1. Open the IDE&#10;2. Click on...&#10;3. See error..."
                            rows={4}
                            className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all focus:ring-2 focus:ring-labstx-orange/20 resize-none ${theme === 'dark'
                                    ? 'bg-caspier-dark border-caspier-border text-caspier-text focus:border-labstx-orange'
                                    : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-labstx-orange'
                                }`}
                        />
                    </div>

                    <div className={`p-3 rounded-lg flex items-start gap-3 ${theme === 'dark' ? 'bg-indigo-500/5 border border-indigo-500/10' : 'bg-indigo-50 border border-indigo-100'
                        }`}>
                        <GithubIcon className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] leading-relaxed text-caspier-muted">
                            Note: This information will be used to create a GitHub issue. Please do not include sensitive data like private keys or passwords.
                        </p>
                    </div>
                </form>

                {/* Footer */}
                <div className={`px-6 py-4 flex items-center justify-end gap-3 border-t ${theme === 'dark' ? 'border-caspier-border bg-caspier-black' : 'border-gray-100 bg-gray-50'
                    }`}>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={onClose}
                        className="font-bold border-none"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSubmit}
                        disabled={!title || !description || isSubmitting}
                        className="flex items-center gap-2 px-6 font-bold shadow-[4px_4px_0_0_rgba(240,80,35,0.2)]"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Submitting...
                            </span>
                        ) : (
                            <>
                                <SendIcon className="w-3.5 h-3.5" />
                                Submit Report
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};
