"use client"

import React, { useState } from "react";
import { AppShell } from "@/components/game/AppShell";
import { TopBar } from "@/components/game/TopBar";
import { useSocket } from "@/components/game/SocketProvider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, Ban } from "lucide-react";

export default function CitizenPage() {
    const { gameState, socket, participant } = useSocket() || {};
    const [hasActed, setHasActed] = useState(false);

    const submitAction = (action: 'PROTEST' | 'SILENT') => {
        socket?.emit('submit_protest', {
            sessionId: gameState?.sessionId,
            action // Backend expects 'PROTEST' or ... wait, backend logic check: 
            // In GameEngine.ts: submitProtest(..., action: string)
        });
        setHasActed(true);
    };

    const isDecisionPhase = gameState?.phase === 'DECISION' || gameState?.phase === 'ALLOCATION_REVEAL';

    if (!isDecisionPhase) {
        return (
            <AppShell header={<TopBar role="Citizen" />}>
                <div className="flex flex-col space-y-4 text-center mt-20">
                    <h2 className="text-2xl font-bold">Life as a Citizen</h2>
                    <p className="text-muted-foreground">Waiting for the regime's decision...</p>
                </div>
            </AppShell>
        );
    }

    if (hasActed && gameState?.phase === 'DECISION') {
        return (
            <AppShell header={<TopBar role="Citizen" />}>
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <h2 className="text-2xl font-bold">Choice Registered</h2>
                    <p className="text-muted-foreground">Stay safe.</p>
                </div>
            </AppShell>
        );
    }

    // Calculations
    const publicSpending = gameState?.allocation?.publicSpending || 0;
    const myBenefit = Math.round(publicSpending * 0.2); // 20% rule

    const rents = gameState?.allocation?.privateRents ? Object.values(gameState.allocation.privateRents) : [];

    const eliteTotal = (rents as number[]).reduce((a: number, b: number) => a + b, 0);
    const eliteMax = rents.length > 0 ? Math.max(...(rents as number[])) : 0;
    const eliteAvg = rents.length > 0 ? Math.round(eliteTotal / rents.length) : 0;

    return (
        <AppShell header={<TopBar role="Citizen" />}>
            <div className="space-y-8 max-w-md mx-auto pt-10">
                <Card className="bg-surface-2 border-none">
                    <CardHeader><CardTitle className="text-center">Your Welfare</CardTitle></CardHeader>
                    <CardContent className="text-center space-y-4">
                        <div>
                            <div className="text-xs text-muted-foreground uppercase">Public Goods Benefit</div>
                            <div className="text-5xl font-bold text-primary">₪{myBenefit}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                            <div>
                                <div className="text-xs text-muted-foreground">Total Public</div>
                                <div className="font-bold">₪{publicSpending}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Tax Rate</div>
                                <div className="font-bold text-danger">High</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-surface-2 border-none">
                    <CardHeader className="pb-2"><CardTitle className="text-center text-sm">Elite Wealth Watch</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                            <div className="text-muted-foreground">Total Rents</div>
                            <div className="font-bold text-accent">₪{eliteTotal}</div>
                        </div>
                        <div>
                            <div className="text-muted-foreground">Avg Rent</div>
                            <div className="font-bold text-accent">₪{eliteAvg}</div>
                        </div>
                        <div>
                            <div className="text-muted-foreground">Top Elite</div>
                            <div className="font-bold text-accent">₪{eliteMax}</div>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Button
                        className="w-full h-20 text-lg bg-surface hover:bg-surface-2 border border-white/10"
                        onClick={() => submitAction('SILENT')}
                    >
                        <Ban className="mr-2" /> Stay Silent
                    </Button>
                    <Button
                        className="w-full h-20 text-lg bg-danger hover:bg-danger/90 text-white"
                        onClick={() => submitAction('PROTEST')}
                    >
                        <Megaphone className="mr-2" /> Protest
                    </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground px-8">
                    Protesting increases the chance of regime change but carries personal risk if the coup fails.
                </p>
            </div>
        </AppShell>
    );
}
