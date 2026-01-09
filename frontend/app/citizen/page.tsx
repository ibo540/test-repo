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

    const isDecisionPhase = gameState?.phase === 'DECISION';

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

    if (hasActed) {
        return (
            <AppShell header={<TopBar role="Citizen" />}>
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <h2 className="text-2xl font-bold">Choice Registered</h2>
                    <p className="text-muted-foreground">Stay safe.</p>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell header={<TopBar role="Citizen" />}>
            <div className="space-y-8 max-w-md mx-auto pt-10">
                <Card className="bg-surface-2 border-none">
                    <CardHeader><CardTitle className="text-center">Public Welfare</CardTitle></CardHeader>
                    <CardContent className="text-center">
                        <div className="text-5xl font-bold text-primary">₪{gameState?.allocation?.publicSpending || 0}</div>
                        <p className="text-muted-foreground mt-2">Allocated to public goods this round.</p>
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
