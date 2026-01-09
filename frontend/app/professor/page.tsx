"use client"

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/game/AppShell";
import { TopBar } from "@/components/game/TopBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/components/game/SocketProvider";
import { Play, Lock, SkipForward, RefreshCw } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';

export default function ProfessorPage() {
    const { gameState, createSession, socket } = useSocket() || {};
    const [joinUrl, setJoinUrl] = useState("");

    // Update Join URL when session/window exists
    useEffect(() => {
        if (typeof window !== 'undefined' && gameState?.sessionId) {
            setJoinUrl(`${window.location.protocol}//${window.location.host}/?code=${gameState.sessionId}`);
        }
    }, [gameState?.sessionId]);

    // Actions
    const handleCreateSession = () => createSession?.();
    const handleStartRound = () => socket?.emit('start_round', { sessionId: gameState?.sessionId });
    const handleLock = () => socket?.emit('lock_session', { sessionId: gameState?.sessionId });

    if (!gameState?.sessionId) {
        return (
            <AppShell header={<TopBar role="Professor" />}>
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <Button size="lg" onClick={handleCreateSession} className="text-xl px-8 py-8 h-auto">
                        <Play className="mr-2 h-6 w-6" /> Create New Session
                    </Button>
                </div>
            </AppShell>
        )
    }

    return (
        <AppShell header={<TopBar role="Professor" />}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Controls */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Game Controls</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <Button onClick={handleStartRound} className="h-24 text-lg bg-success hover:bg-success/90 text-white">
                            <Play className="mr-2" /> Start Round {gameState.round + 1}
                        </Button>
                        <Button onClick={handleLock} variant="outline" className="h-24 text-lg">
                            <Lock className="mr-2" /> Lock / Unlock Join
                        </Button>
                        <Button variant="secondary" className="h-16">
                            <SkipForward className="mr-2" /> Force Next Phase
                        </Button>
                        <Button variant="secondary" className="h-16">
                            <RefreshCw className="mr-2" /> Reset Round
                        </Button>
                    </CardContent>
                </Card>

                {/* Tracking */}
                <Card>
                    <CardHeader>
                        <CardTitle>Session Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between border-b border-border pb-2">
                            <span className="text-muted-foreground">Session ID</span>
                            <span className="font-mono text-xl">{gameState.sessionId}</span>
                        </div>
                        <div className="flex justify-between border-b border-border pb-2">
                            <span className="text-muted-foreground">Players</span>
                            <span className="font-mono text-xl">{gameState.participants ? Object.keys(gameState.participants).length : 0}</span>
                        </div>
                        <div className="flex justify-between border-b border-border pb-2">
                            <span className="text-muted-foreground">Phase</span>
                            <span className="font-mono text-xl text-accent">{gameState.phase}</span>
                        </div>

                        {joinUrl && (
                            <div className="flex flex-col items-center pt-4">
                                <span className="text-xs text-muted-foreground mb-2 uppercase">Join Code</span>
                                <div className="bg-white p-2 rounded">
                                    <QRCodeSVG value={joinUrl} size={128} />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 text-center max-w-[200px]">
                                    Scan to join as Student. <br />
                                    Ensure you are on the same Wi-Fi.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Player List (Simplified) */}
                <Card className="md:col-span-3">
                    <CardHeader>
                        <CardTitle>Participants</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                            {gameState.participants && Object.values(gameState.participants).map((p: any) => (
                                <div key={p.id} className="p-2 bg-surface-2 rounded border border-border text-xs flex flex-col">
                                    <span className="font-bold truncate">{p.name}</span>
                                    <span className="text-muted-foreground truncate">{p.role || 'Joining...'}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}
