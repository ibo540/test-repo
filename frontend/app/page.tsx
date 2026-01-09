"use client"

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/components/game/SocketProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { AppShell } from "@/components/game/AppShell";
import { TopBar } from "@/components/game/TopBar";
import { motion } from "framer-motion";
import { ShieldAlert, Users, Play, Lock } from "lucide-react";

export default function JoinPage() {
    const { isConnected, joinSession, participant, gameState } = useSocket() || {};
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [isWaiting, setIsWaiting] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Auto-fill session from URL query if present (QR code)
        const params = new URLSearchParams(window.location.search);
        const urlCode = params.get("code");
        if (urlCode) setCode(urlCode);
    }, []);

    useEffect(() => {
        if (participant?.role) {
            // Redirect based on role
            const role = participant.role.toLowerCase();
            router.push(`/${role}`);
        } else if (participant?.name) {
            setIsWaiting(true);
            setIsConnecting(false);
        }
    }, [participant, router]);

    // Connection Timeout Handler
    useEffect(() => {
        if (isConnecting) {
            const timer = setTimeout(() => {
                if (isWaiting) return; // Success
                setIsConnecting(false);
                setError("Connection timed out. Check Wi-Fi or try again.");
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [isConnecting, isWaiting]);

    const handleJoin = () => {
        setError("");

        // Input Validation
        if (!code) { setError("Session Code is required"); return; }
        if (code.length < 4) { setError("Session Code must be at least 4 characters"); return; }
        if (!name.trim()) { setError("Name is required"); return; }
        if (name.length > 15) { setError("Name represents you. Keep it under 15 chars."); return; }

        setIsConnecting(true);
        joinSession?.(code.toUpperCase(), name);
    };

    const handleCreateNewIdentity = () => {
        // Direct action, no confirm to avoid mobile browser blocking
        const socketCtx = useSocket() as any;
        if (socketCtx && socketCtx.createNewProfile) {
            socketCtx.createNewProfile();
        } else {
            console.error("Socket Context missing createNewProfile");
            // Fallback manual
            const newId = Math.random().toString(36).substring(2, 15);
            localStorage.setItem('auth_game_device_id', newId);
            window.location.reload();
        }
    };

    // If we are waiting for role assignment
    if (isWaiting) {
        return (
            <AppShell header={<TopBar hideRole />}>
                <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
                    <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center text-accent"
                    >
                        <Users size={40} />
                    </motion.div>
                    <div>
                        <h2 className="text-2xl font-bold">Welcome, {name}</h2>
                        <p className="text-muted-foreground mt-2">Waiting for the Professor to start the game...</p>
                    </div>
                    <Card className="w-full max-w-md bg-surface/50 border-white/5">
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Session Code</span>
                                <span className="font-mono font-bold text-white tracking-widest">{code || gameState?.sessionId || '---'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Status</span>
                                <span className="text-warning">Lobby Open</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Players</span>
                                <span>{gameState?.participants ? Object.keys(gameState.participants).length : '-'}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="flex flex-col items-center justify-center min-h-[80vh] w-full">
                <div className="mb-8 text-center space-y-2">
                    <ShieldAlert className="w-16 h-16 mx-auto text-accent mb-4" />
                    <h1 className="text-4xl font-bold tracking-tight">Regime</h1>
                    <p className="text-muted-foreground">Classroom Authoritarian Simulation</p>
                </div>

                <Card className="w-full max-w-md border-surface-2 bg-surface">
                    <CardHeader>
                        <CardTitle>Join Session</CardTitle>
                        <CardDescription>Enter the code on the projector to join.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Session Code</label>
                            <Input
                                placeholder="e.g. A7X2"
                                className="text-center font-mono text-lg uppercase tracking-widest h-12 bg-background border-surface-2 focus:border-accent"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                maxLength={6}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Name</label>
                            <Input
                                placeholder="Your Name"
                                className="h-12 bg-background border-surface-2 focus:border-accent"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        {error && <p className="text-sm text-danger">{error}</p>}
                    </CardContent>
                    <CardFooter>
                        <Button
                            className="w-full h-12 text-lg font-bold bg-accent hover:bg-accent/90 text-white"
                            onClick={handleJoin}
                            disabled={!isConnected}
                        >
                            {isConnected ? "Join Game" : "Connecting..."}
                        </Button>
                    </CardFooter>
                </Card>

                <div className="mt-8 max-w-md w-full space-y-4">
                    <div className="text-xs text-center text-muted-foreground uppercase tracking-widest">Or login as</div>
                    <div className="grid grid-cols-2 gap-4">
                        <Button variant="outline" className="w-full" onClick={() => router.push('/professor')}>
                            Professor
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => router.push('/projector')}>
                            Projector
                        </Button>
                    </div>

                    {/* Developer / Testing Mode: Profile Switcher (Only visible locally or with ?debug=true) */}
                    {(typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.search.includes('debug=true'))) && (
                        <Card className="border-dashed border-white/20 bg-black/20">
                            <CardHeader className="py-3">
                                <CardTitle className="text-sm font-mono text-muted-foreground">DEBUG: MULTI-ROLE TESTER</CardTitle>
                            </CardHeader>
                            <CardContent className="py-3 space-y-2">
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="w-full"
                                    onClick={handleCreateNewIdentity}
                                >
                                    + Create New Identity
                                </Button>

                                <div className="text-xs text-center text-muted-foreground pt-2">
                                    Current ID: {typeof window !== 'undefined' ? localStorage.getItem('auth_game_device_id')?.slice(0, 6) : '...'}
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {typeof window !== 'undefined' && Object.entries(JSON.parse(localStorage.getItem('auth_game_profiles') || '{}')).map(([pid, pname]: any) => (
                                        <Button
                                            key={pid}
                                            variant={localStorage.getItem('auth_game_device_id') === pid ? "default" : "secondary"}
                                            size="sm"
                                            className="text-xs truncate"
                                            onClick={() => (useSocket() as any).switchProfile(pid)}
                                        >
                                            {pname} {localStorage.getItem('auth_game_device_id') === pid && "(You)"}
                                        </Button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
