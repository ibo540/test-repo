"use client"

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/game/AppShell";
import { TopBar } from "@/components/game/TopBar";
import { useSocket } from "@/components/game/SocketProvider";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { AlertTriangle, Lock, Banknote, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function LeaderPage() {
    const { socket, gameState, isConnected } = useSocket() || {};
    const [publicSpending, setPublicSpending] = useState(0);
    const [coercion, setCoercion] = useState(0);
    const [rents, setRents] = useState<Record<string, number>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [elites, setElites] = useState<any[]>([]); // ROBUST: Local state for elites

    useEffect(() => {
        if (socket && gameState?.sessionId) {
            // ROBUST SYNC: Fetch explicit roster
            socket.emit('get_elite_roster', { sessionId: gameState.sessionId });

            socket.on('elite_roster', (roster: any[]) => {
                console.log("Roster received:", roster);
                setElites(roster);
            });

            return () => {
                socket.off('elite_roster');
            }
        }
    }, [socket, gameState?.sessionId]);

    // Fallback: Sync with gameState participants if roster fetch pending
    useEffect(() => {
        if (elites.length === 0 && gameState?.participants) {
            const derivedElites = Object.values(gameState.participants)
                .filter((p: any) => p.role && p.role.toLowerCase() === 'elite')
                .map((p: any) => ({
                    eliteId: p.id,
                    eliteName: p.name,
                    elitePosition: p.elitePosition
                }));
            if (derivedElites.length > 0) setElites(derivedElites);
        }
    }, [gameState?.participants, elites.length]);

    const remainingBudget = (gameState?.budget || 100) - publicSpending - Object.values(rents).reduce((a, b) => a + b, 0);
    // Initialize rents based on participants (Elites)
    useEffect(() => {
        if (gameState?.participants) {
            const newRents: Record<string, number> = {};
            Object.values(gameState.participants).forEach((p: any) => {
                if (p.role === 'ELITE') {
                    newRents[p.id] = rents[p.id] || 0;
                }
            });
            setRents(newRents);
        }
    }, [gameState?.participants]);

    const totalRents = Object.values(rents).reduce((a, b) => a + b, 0);
    const totalBudget = 100; // Fixed for now
    const remaining = totalBudget - publicSpending - totalRents;
    const isValid = remaining === 0;

    const handleRentChange = (id: string, val: number) => {
        setRents(prev => ({ ...prev, [id]: val }));
    };

    const submitAllocation = () => {
        if (!isValid) return;
        socket?.emit('submit_allocation', {
            sessionId: gameState?.sessionId,
            allocation: {
                publicSpending,
                coercionLevel: coercion,
                privateRents: rents
            }
        });
        setIsSubmitted(true);
    };

    if (gameState?.phase !== 'ALLOCATION') {
        return (
            <AppShell header={<TopBar role="Leader" />}>
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
                    <Lock className="w-16 h-16 text-muted-foreground mb-4" />
                    <h2 className="text-2xl font-bold">Waiting for Phase Change</h2>
                    <p className="text-muted-foreground">You can only allocate budget during the Allocation phase.</p>
                </div>
            </AppShell>
        );
    }

    if (isSubmitted) {
        return (
            <AppShell header={<TopBar role="Leader" />}>
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-4 text-success">
                        <CheckCircle2 size={64} />
                    </motion.div>
                    <h2 className="text-2xl font-bold">Allocation Submitted</h2>
                    <p className="text-muted-foreground">Waiting for elites to vote...</p>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell header={<TopBar role="Leader" />}>
            <div className="space-y-6 max-w-2xl mx-auto pb-20">
                {/* Budget Summary Sticky */}
                <Card className="sticky top-20 z-40 border-accent/50 bg-surface/95 backdrop-blur">
                    <CardContent className="pt-6 flex justify-between items-center">
                        <div>
                            <div className="text-xs text-muted-foreground uppercase">Remaining</div>
                            <div className={`text-3xl font-mono font-bold ${remaining < 0 ? 'text-danger' : 'text-primary'}`}>
                                ₪{remaining}
                            </div>
                        </div>
                        <Button size="lg" disabled={!isValid} onClick={submitAllocation} className={isValid ? 'bg-accent text-white' : ''}>
                            submit Budget
                        </Button>
                    </CardContent>
                </Card>

                {/* Public Spending */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Banknote className="text-blue-400" /> Public Spending
                        </CardTitle>
                        <CardDescription>Benefits Citizens. Prevents protests.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between">
                            <span className="font-bold text-2xl">₪{publicSpending}</span>
                        </div>
                        <Slider
                            value={[publicSpending]}
                            onValueChange={(v) => setPublicSpending(v[0])}
                            max={100}
                            step={1}
                            className="py-4"
                        />
                    </CardContent>
                </Card>

                {/* Coercion */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldAlert className="text-danger" /> Coercion Level
                        </CardTitle>
                        <CardDescription>Punishes dissent. Increases pressure.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between">
                            <span className="font-bold text-2xl text-danger">Level {coercion}</span>
                        </div>
                        <Slider
                            value={[coercion]}
                            onValueChange={(v) => setCoercion(v[0])}
                            max={10}
                            step={1}
                            className="py-4"
                        />
                    </CardContent>
                </Card>

                {/* Private Rents */}
                <Card>
                    <CardHeader>
                        <CardTitle>Private Rents</CardTitle>
                        <CardDescription>Buy Elite loyalty. Prevent coups.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {elites.map((elite: any) => (
                            <div key={elite.eliteDeviceId || elite.eliteId} className="flex items-center gap-4 border-b border-white/5 pb-4 last:border-0">
                                <div className="flex-1">
                                    <div className="font-medium">{elite.eliteName}</div>
                                    <div className="text-xs text-muted-foreground">{elite.elitePosition || 'Elite'}</div>
                                </div>
                                <div className="w-24">
                                    <Input
                                        type="number"
                                        value={rents[elite.eliteDeviceId] || ''} // Use Stable DeviceID
                                        onChange={(e) => handleRentChange(elite.eliteDeviceId, parseInt(e.target.value) || 0)}
                                        className="text-right"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        ))}
                        {elites.length === 0 && (
                            <p className="text-muted-foreground text-center py-4">No Elites found.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}
