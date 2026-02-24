import React, { useState, useRef, useEffect } from 'react';
import { ClarityDebugger, DebugLine } from '../../services/stacks/debugger';

const ClarityRepl: React.FC = () => {
    const [lines, setLines] = useState<DebugLine[]>([
        { id: '1', type: 'output', content: 'Clarity REPL (Stacks Devnet)' },
        { id: '2', type: 'output', content: 'Connected to external Clarinet server.' }
    ]);
    const [input, setInput] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [lines]);

    const handleSend = async () => {
        if (!input.trim() || isExecuting) return;

        const commandId = Date.now().toString();
        const inputLine: DebugLine = { id: commandId, type: 'input', content: input };
        setLines(prev => [...prev, inputLine]);

        const currentInput = input;
        setInput('');
        setIsExecuting(true);

        try {
            // In a real scenario, we might pass the current contract code too
            const result = await ClarityDebugger.execute(currentInput);

            const responseLine: DebugLine = {
                id: (Date.now() + 1).toString(),
                type: result.success ? 'output' : 'error',
                content: result.output
            };

            setLines(prev => [...prev, responseLine]);
        } catch (error: any) {
            setLines(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                type: 'error',
                content: `Error: ${error.message}`
            }]);
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-caspier-black font-mono text-xs">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1">
                {lines.map(line => (
                    <div key={line.id} className="flex gap-2">
                        <span className={`shrink-0 ${line.type === 'input' ? 'text-labstx-orange' : line.type === 'error' ? 'text-red-500' : 'text-caspier-muted'}`}>
                            {line.type === 'input' ? '>>' : '..'}
                        </span>
                        <span className={line.type === 'input' ? 'text-caspier-text' : line.type === 'error' ? 'text-red-400' : 'text-indigo-400'}>
                            {line.content}
                        </span>
                    </div>
                ))}
                {isExecuting && (
                    <div className="flex gap-2 animate-pulse">
                        <span className="text-caspier-muted">..</span>
                        <span className="text-caspier-muted italic">Executing...</span>
                    </div>
                )}
            </div>
            <div className="p-2 border-t border-caspier-border flex gap-2">
                <span className="text-labstx-orange py-1">{">>"}</span>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    disabled={isExecuting}
                    className="flex-1 bg-transparent outline-none text-caspier-text"
                    placeholder={isExecuting ? "Waiting for response..." : "Enter Clarity expression..."}
                    autoFocus
                />
            </div>
        </div>
    );
};

export default ClarityRepl;
