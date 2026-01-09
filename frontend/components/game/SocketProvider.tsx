"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Keep in sync with backend types
export type GamePhase = 'LOBBY' | 'ROLE_ASSIGNMENT' | 'POLICY_DILEMMA' | 'ALLOCATION' | 'ALLOCATION_REVEAL' | 'DECISION' | 'RESOLUTION' | 'ROUND_REPORT' | 'GAME_OVER';

interface GameState {
    sessionId?: string;
    round: number;
    phase: GamePhase;
    phaseEndTime?: number;
    allocation?: any;
    participants?: any[];
    // Add other fields as needed
}

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    gameState: GameState;
    participant: any | null; // My identity
    createSession: () => void;
    joinSession: (sessionId: string, name: string) => void;
    // Add other actions
}

const SocketContext = createContext<SocketContextType | null>(null);

export function useSocket() {
    return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [gameState, setGameState] = useState<GameState>({
        round: 0,
        phase: 'LOBBY'
    });
    const [participant, setParticipant] = useState<any | null>(null);

    useEffect(() => {
        // Dynamic connection string
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;

        let url = '';
        if (hostname.includes('vercel.app')) {
            // Production Backend
            url = 'https://test-repo-3aix.onrender.com';
        } else {
            // Local Development
            const backendPort = '3000';
            url = `${protocol}//${hostname}:${backendPort}`;
        }

        const socketInstance = io(url, {
            transports: ['websocket'],
            autoConnect: true
        });

        socketInstance.on('connect', () => {
            setIsConnected(true);
        });

        socketInstance.on('disconnect', () => {
            setIsConnected(false);
        });

        // Global State Listeners
        socketInstance.on('session_created', (data) => {
            setGameState(prev => ({ ...prev, sessionId: data.sessionId }));
        });

        socketInstance.on('joined', (data) => {
            // We joined
        });

        socketInstance.on('state_update', (data) => {
            setGameState(prev => ({ ...prev, ...data }));
        });

        socketInstance.on('role_assigned', (data) => {
            setParticipant((prev: any) => ({ ...prev, ...data }));
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    const createSession = () => {
        socket?.emit('create_session');
    };

    const joinSession = (sessionId: string, name: string) => {
        socket?.emit('join_session', { sessionId, name });
        // Optimistic update identity?
        setParticipant({ name });
    };

    return (
        <SocketContext.Provider value={{
            socket,
            isConnected,
            gameState,
            participant,
            createSession,
            joinSession
        }}>
            {children}
        </SocketContext.Provider>
    );
}
