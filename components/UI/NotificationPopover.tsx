import React, { useRef, useEffect } from 'react';
import { BellIcon, InfoIcon, CheckCircleIcon, AlertTriangleIcon, XCircleIcon } from './Icons';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: Date;
    read: boolean;
}

interface NotificationPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    anchorRect: DOMRect | null;
    notifications: Notification[];
    onMarkAllRead?: () => void;
    onClearAll?: () => void;
}

const NotificationPopover: React.FC<NotificationPopoverProps> = ({
    isOpen,
    onClose,
    anchorRect,
    notifications,
    onMarkAllRead,
    onClearAll
}) => {
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen || !anchorRect) return null;

    const top = anchorRect.bottom + 8;
    const right = window.innerWidth - anchorRect.right;

    return (
        <div
            ref={popoverRef}
            className="fixed z-[100] w-80 bg-caspier-black border border-caspier-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
            style={{ top, right }}
        >
            <div className="p-4 border-b border-caspier-border bg-caspier-panel/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BellIcon className="w-4 h-4 text-labstx-orange" />
                    <span className="text-sm font-bold text-caspier-text">Updates</span>
                </div>
                <div className="flex gap-2">
                    {notifications.length > 0 && (
                        <button
                            onClick={onMarkAllRead}
                            className="text-[10px] font-bold text-caspier-muted hover:text-caspier-text uppercase tracking-wider transition-colors"
                        >
                            Mark All Read
                        </button>
                    )}
                </div>
            </div>

            <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                    <div className="p-8 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-full bg-caspier-dark border border-caspier-border flex items-center justify-center mb-3">
                            <BellIcon className="w-6 h-6 text-caspier-muted/30" />
                        </div>
                        <p className="text-xs font-medium text-caspier-muted">No new notifications</p>
                        <p className="text-[10px] text-caspier-muted/60 mt-1">We'll notify you when something happens</p>
                    </div>
                ) : (
                    <div className="divide-y divide-caspier-border/50">
                        {notifications.map((notif) => (
                            <div
                                key={notif.id}
                                className={`p-4 hover:bg-caspier-hover/50 transition-colors cursor-pointer group relative ${!notif.read ? 'bg-labstx-orange/5' : ''}`}
                            >
                                {!notif.read && (
                                    <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-labstx-orange" />
                                )}
                                <div className="flex gap-3">
                                    <div className="mt-0.5">
                                        {notif.type === 'info' && <InfoIcon className="w-4 h-4 text-blue-500" />}
                                        {notif.type === 'success' && <CheckCircleIcon className="w-4 h-4 text-emerald-500" />}
                                        {notif.type === 'warning' && <AlertTriangleIcon className="w-4 h-4 text-amber-500" />}
                                        {notif.type === 'error' && <XCircleIcon className="w-4 h-4 text-red-500" />}
                                    </div>
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                        <span className="text-xs font-bold text-caspier-text truncate leading-tight">
                                            {notif.title}
                                        </span>
                                        <p className="text-[11px] text-caspier-muted line-clamp-2 leading-relaxed">
                                            {notif.message}
                                        </p>
                                        <span className="text-[9px] text-caspier-muted/60 mt-1 font-medium">
                                            {new Intl.RelativeTimeFormat('en', { style: 'short' }).format(
                                                Math.round((notif.timestamp.getTime() - Date.now()) / 60000),
                                                'minute'
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {notifications.length > 0 && (
                <div className="p-3 bg-caspier-panel/30 border-t border-caspier-border">
                    <button
                        onClick={onClearAll}
                        className="w-full py-2 rounded-lg border border-caspier-border hover:bg-caspier-dark text-[10px] font-bold text-caspier-text uppercase tracking-widest transition-all"
                    >
                        Clear All
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationPopover;
