import React, { useState, useEffect, useRef } from 'react';
import { FileNode } from '../../types';
import { SmartFileIcon, XIcon, HomeIcon } from '../UI/Icons';

interface EditorTabsProps {
  files: FileNode[];
  openFileIds: string[];
  activeFileId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onCloseOthers: (id: string) => void;
  onCloseAll: () => void;
  onReorder: (newOrder: string[]) => void;
  modifiedFileIds: string[];
}

const EditorTabs: React.FC<EditorTabsProps> = ({
  files,
  openFileIds,
  activeFileId,
  onSelect,
  onClose,
  onCloseOthers,
  onCloseAll,
  onReorder,
  modifiedFileIds
}) => {
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, id: string } | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Helper to find file details for display
  const findFileDetails = (nodes: FileNode[], id: string): { name: string, type: string } | null => {
    if (id === '@home') return { name: 'Home', type: 'file' };
    for (const node of nodes) {
      if (node.id === id) return { name: node.name, type: node.type };
      if (node.children) {
        const found = findFileDetails(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, id });
  };

  // Drag and Drop handlers
  const onDragStart = (id: string) => {
    setDraggedId(id);
  };

  const onDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId === null || draggedId === id) return;

    const newOrder = [...openFileIds];
    const draggedIdx = newOrder.indexOf(draggedId);
    const dropIdx = newOrder.indexOf(id);

    newOrder.splice(draggedIdx, 1);
    newOrder.splice(dropIdx, 0, draggedId);

    onReorder(newOrder);
  };

  const onDragEnd = () => {
    setDraggedId(null);
  };

  if (openFileIds.length === 0) return null;

  return (
    <div className="flex bg-caspier-black border-b border-caspier-border overflow-x-auto scrollbar-hide select-none transition-all">
      {openFileIds.map((id) => {
        const file = findFileDetails(files, id);
        if (!file) return null;

        const isActive = id === activeFileId;
        const isModified = modifiedFileIds.includes(id);

        return (
          <div
            key={id}
            draggable
            onDragStart={() => onDragStart(id)}
            onDragOver={(e) => onDragOver(e, id)}
            onDragEnd={onDragEnd}
            onClick={() => onSelect(id)}
            onContextMenu={(e) => handleContextMenu(e, id)}
            className={`
              group flex items-center gap-2 px-3 py-2 text-xs cursor-pointer min-w-[120px] max-w-[200px] border-r border-caspier-border transition-all relative
              ${isActive
                ? 'bg-caspier-dark text-caspier-text border-t-2 border-t-caspier-red'
                : 'bg-caspier-black text-caspier-muted hover:text-caspier-text hover:bg-caspier-hover border-t-2 border-t-transparent'
              }
              ${draggedId === id ? 'opacity-40 scale-95' : 'opacity-100'}
            `}
          >
            {id === '@home' ? (
              <HomeIcon className={`w-3.5 h-3.5 ${isActive ? 'text-caspier-red' : 'text-caspier-muted'}`} />
            ) : (
              <SmartFileIcon name={file.name} className={`w-3 h-3 ${isActive ? 'text-caspier-red' : 'text-caspier-muted'}`} />
            )}

            <span className={`truncate flex-1 ${isModified ? 'font-medium italic text-caspier-text/80' : ''}`}>
              {file.name}
            </span>

            <div className="flex items-center justify-center w-4">
              {isModified && !isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-caspier-muted/50 group-hover:hidden" />
              )}
              {isModified && isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-caspier-red group-hover:hidden" />
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(id);
                }}
                className={`p-0.5 rounded-sm hover:bg-caspier-hover transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <XIcon className="w-3 h-3" />
              </button>
            </div>

            {/* Active Highlight Bottom */}
            {isActive && <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-caspier-dark" />}
          </div>
        );
      })}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-caspier-dark border border-caspier-border rounded shadow-2xl z-[1000] py-1 min-w-[150px] animate-in fade-in zoom-in duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-caspier-red hover:text-caspier-black transition-colors"
            onClick={() => { onClose(contextMenu.id); setContextMenu(null); }}
          >
            Close
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-caspier-red hover:text-caspier-black transition-colors"
            onClick={() => { onCloseOthers(contextMenu.id); setContextMenu(null); }}
          >
            Close Others
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-caspier-red hover:text-caspier-black transition-colors"
            onClick={() => { onCloseAll(); setContextMenu(null); }}
          >
            Close All
          </button>
        </div>
      )}
    </div>
  );
};

export default EditorTabs;
