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
    createNewProfile: () => void;
    switchProfile: (profileId: string) => void;
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

    // Helpers for Device ID
    const generateId = () => {
        // Fallback for environments where crypto is not available
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    };

    const getDeviceId = () => {
        if (typeof window === 'undefined') return '';
        let id = localStorage.getItem('auth_game_device_id');
        if (!id) {
            id = generateId();
            localStorage.setItem('auth_game_device_id', id);
        }
        return id;
    };

    const switchProfile = (profileId: string) => {
        localStorage.setItem('auth_game_device_id', profileId);
        window.location.reload();
    };

    const createNewProfile = () => {
        const newId = generateId();
        localStorage.setItem('auth_game_device_id', newId);
        window.location.reload();
    };

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

        socketInstance.on('reconnect_success', (data) => {
            if (data?.participant) setParticipant(data.participant);
        });

        socketInstance.on('state_update', (data) => {
            setGameState(prev => ({ ...prev, ...data }));
        });

        socketInstance.on('participant_list', (data) => {
            setGameState(prev => ({
                ...prev,
                participants: data
            }));
        });

        socketInstance.on('role_assigned', (data) => {
            setParticipant((prev: any) => ({ ...prev, ...data }));
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.off('connect');
            socketInstance.off('disconnect');
            socketInstance.off('session_created');
            socketInstance.off('joined');
            socketInstance.off('reconnect_success');
            socketInstance.off('state_update');
            socketInstance.off('participant_list');
            socketInstance.off('role_assigned');
            socketInstance.disconnect();
        };
    }, []);

    const createSession = () => {
        socket?.emit('create_session');
    };

    const joinSession = (sessionId: string, name: string) => {
        const deviceId = getDeviceId();

        // Save profile metadata for switcher
        const profiles = JSON.parse(localStorage.getItem('auth_game_profiles') || '{}');
        profiles[deviceId] = name;
        localStorage.setItem('auth_game_profiles', JSON.stringify(profiles));

        socket?.emit('join_session', { sessionId, name, deviceId });
        // Optimistic update identity?
        setParticipant({ name, deviceId });
    };

    return (
        <SocketContext.Provider value={{
            socket,
            isConnected,
            gameState,
            participant,
            createSession,
            joinSession,
            createNewProfile,
            switchProfile
        }}>
            {children}
        </SocketContext.Provider>
    );
}
