"use client"

import React from "react";
import { AppShell } from "@/components/game/AppShell";
import { useSocket } from "@/components/game/SocketProvider";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

import { QRCodeSVG } from 'qrcode.react';

export default function ProjectorPage() {
    const { gameState } = useSocket() || {};
    const [joinUrl, setJoinUrl] = React.useState("");

    React.useEffect(() => {
        if (typeof window !== 'undefined' && gameState?.sessionId) {
            // Construct URL for joining
            setJoinUrl(`${window.location.protocol}//${window.location.host}/?code=${gameState.sessionId}`);
        }
    }, [gameState?.sessionId]);

    // If no session, show placeholder
    if (!gameState?.sessionId) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white">
                <h1 className="text-6xl font-bold mb-8">Ready to Connect</h1>
                <p className="text-2xl text-muted-foreground">Waiting for Professor to create session...</p>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen overflow-hidden bg-background p-8 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 border-b border-border pb-4">
                <div className="flex items-center gap-8">
                    <div>
                        <div className="text-sm text-muted-foreground uppercase tracking-[0.5em]">Session Code</div>
                        <div className="text-8xl font-mono font-bold text-white tracking-widest">{gameState.sessionId}</div>
                    </div>
                    {joinUrl && (
                        <div className="p-2 bg-white rounded">
                            <QRCodeSVG value={joinUrl} size={128} />
                        </div>
                    )}
                </div>
                <div className="text-right">
                    <div className="text-sm text-muted-foreground uppercase tracking-[0.5em]">Current Phase</div>
                    <div className="text-6xl font-bold text-accent">{gameState.phase?.replace('_', ' ')}</div>
                </div>
            </div>

            {/* Main Content Area - Dynamic based on phase */}
            <div className="flex-1 grid grid-cols-12 gap-8">
                {/* Stats Panel */}
                <div className="col-span-4 space-y-6">
                    <Card className="bg-surface-2 border-none">
                        <CardContent className="p-8">
                            <div className="text-sm text-muted-foreground uppercase mb-2">Public Spending</div>
                            <div className="text-6xl font-mono text-white">₪{gameState.allocation?.publicSpending || 0}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-surface-2 border-none">
                        <CardContent className="p-8">
                            <div className="text-sm text-muted-foreground uppercase mb-2">Pressure Index</div>
                            <div className="text-6xl font-mono text-danger">{(gameState as any).pressureIndex || 0}%</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Central Display */}
                <div className="col-span-8 bg-surface rounded-3xl border border-white/5 flex items-center justify-center p-12 relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={gameState.phase}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center"
                        >
                            {/* Phase specific content would go here */}
                            <h2 className="text-5xl font-bold text-white mb-4">Round {gameState.round}</h2>
                            <p className="text-2xl text-muted-foreground">Follow instructions on your device.</p>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
