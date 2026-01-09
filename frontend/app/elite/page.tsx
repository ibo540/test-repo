"use client"

import React, { useState } from "react";
import { AppShell } from "@/components/game/AppShell";
import { TopBar } from "@/components/game/TopBar";
import { useSocket } from "@/components/game/SocketProvider";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ThumbsUp, Skull } from "lucide-react";

export default function ElitePage() {
    const { gameState, socket, participant } = useSocket() || {};
    const [hasVoted, setHasVoted] = useState(false);

    const submitVote = (vote: 'LOYAL' | 'COUP') => {
        socket?.emit('submit_vote', {
            sessionId: gameState?.sessionId,
            vote
        });
        setHasVoted(true);
    };

    // My Offer?
    const myOffer = gameState?.participants?.[socket?.id || '']?.currentOffer; // Backend needs to send this specifically
    // Currently backend sends 'externalOffers' list? Or private update?
    // Backend "Private updates to specific devices". 
    // We need to ensuring receiving 'external_offer' event or checking state.

    const isDecisionPhase = gameState?.phase === 'DECISION';

    if (!isDecisionPhase) {
        return (
            <AppShell header={<TopBar role="Elite" position={participant?.elitePosition} />}>
                <div className="flex flex-col space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Status</CardTitle></CardHeader>
                        <CardContent>
                            <p>Waiting for Leader allocation...</p>
                            <div className="mt-4 p-4 bg-surface-2 rounded text-center">
                                <span className="text-sm text-muted-foreground">Current Points</span>
                                <div className="text-3xl font-bold text-accent">{participant?.points || 0}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </AppShell>
        );
    }

    if (hasVoted) {
        return (
            <AppShell header={<TopBar role="Elite" />}>
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <h2 className="text-2xl font-bold">Vote Cast</h2>
                    <p className="text-muted-foreground">Waiting for resolution...</p>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell header={<TopBar role="Elite" position={participant?.elitePosition} />}>
            <div className="space-y-6 max-w-md mx-auto">
                {/* Allocation Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Leader's Allocation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between border-b border-white/5 pb-2">
                            <span>Your Rent</span>
                            <span className="font-bold text-success">₪{gameState?.allocation?.privateRents?.[socket?.id || ''] || 0}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-2">
                            <span>Public Spending</span>
                            <span className="font-bold">₪{gameState?.allocation?.publicSpending || 0}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* External Offer (Mocked UI for now if no data) */}
                {/* {myOffer && (
                     <Card className="border-warning bg-warning/10">
                        <CardHeader>
                            <CardTitle className="text-warning flex items-center gap-2"><AlertTriangle/> External Offer</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>The Foreign Power offers you <strong>+10 Points</strong> if you betray the leader.</p>
                        </CardContent>
                     </Card>
                 )} */}

                {/* Voting */}
                <div className="grid grid-cols-2 gap-4">
                    <Button
                        size="lg"
                        variant="outline"
                        className="h-32 text-xl flex flex-col gap-2 border-success/50 hover:bg-success/20 hover:text-success"
                        onClick={() => submitVote('LOYAL')}
                    >
                        <ThumbsUp size={32} />
                        Loyal
                    </Button>
                    <Button
                        size="lg"
                        variant="outline"
                        className="h-32 text-xl flex flex-col gap-2 border-danger/50 hover:bg-danger/20 hover:text-danger"
                        onClick={() => submitVote('COUP')}
                    >
                        <Skull size={32} />
                        Coup
                    </Button>
                </div>
            </div>
        </AppShell>
    );
}
