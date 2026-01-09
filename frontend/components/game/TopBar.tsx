"use client"

import { useSocket } from "./SocketProvider";
import { Badge } from "@/components/ui/badge";
import { ConnectionStatus } from "./ConnectionStatus";
import { cn } from "@/lib/utils";

interface TopBarProps {
    role?: string;
    position?: string;
    hideRole?: boolean;
    className?: string;
}

export function TopBar({ role, position, hideRole = false, className }: TopBarProps) {
    const { gameState } = useSocket() || {};
    const { sessionId, round, phase } = gameState || {};

    return (
        <div className={cn("w-full border-b border-border bg-surface p-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md bg-opacity-80", className)}>
            <div className="flex items-center gap-4">
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase tracking-widest">Session</span>
                    <span className="font-mono font-bold text-xl text-primary">{sessionId || '---'}</span>
                </div>

                {!hideRole && role && (
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground uppercase tracking-widest">Role</span>
                        <Badge variant="outline" className="w-fit">{role} {position ? `- ${position}` : ''}</Badge>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                    <div className="text-xs text-muted-foreground uppercase tracking-widest">Round {round}</div>
                    <div className="font-bold text-sm text-accent">{phase?.replace('_', ' ')}</div>
                </div>
                <ConnectionStatus />
            </div>
        </div>
    );
}
