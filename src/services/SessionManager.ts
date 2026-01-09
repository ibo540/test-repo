import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { Session, GamePhase, Participant } from '../types';
import { RoleService } from './RoleService';

import { GameEngine } from './GameEngine';

export class SessionManager {
    private sessions: Record<string, Session> = {};
    private io: Server;
    private roleService: RoleService;
    private gameEngine: GameEngine;

    constructor(io: Server) {
        this.io = io;
        this.roleService = new RoleService();
        this.gameEngine = new GameEngine(io);
    }

    public handleConnection(socket: Socket) {
        socket.on('create_session', () => this.createSession(socket));
        socket.on('join_session', (payload: { sessionId: string; name: string; deviceId?: string }) =>
            this.joinSession(socket, payload));
        socket.on('lock_session', (payload: { sessionId: string }) =>
            this.lockSession(socket, payload.sessionId));

        // Game Actions
        socket.on('start_round', (payload: { sessionId: string }) => {
            const session = this.sessions[payload.sessionId];
            if (session && session.professorId === socket.id) {
                // Check for Role Reshuffle based on previous round outcome
                if (session.lastRoundOutcome?.leaderRemoved) {
                    this.roleService.reshuffleRoles(session);
                    // Notify updated roles
                    Object.values(session.participants).forEach(p => {
                        this.io.to(p.id).emit('role_assigned', { role: p.role, position: p.elitePosition });
                    });
                }

                this.gameEngine.startRound(session);
            }
        });

        socket.on('submit_allocation', (payload: { sessionId: string, allocation: any }) => {
            const session = this.sessions[payload.sessionId];
            // Security: Check if socket user is LEADER
            const participant = Object.values(session?.participants || {}).find(p => p.id === socket.id);
            if (session && participant?.role === 'LEADER') {
                this.gameEngine.processAllocation(session, payload.allocation);
            }
        });

        socket.on('submit_vote', (payload: { sessionId: string, vote: 'LOYAL' | 'COUP' }) => {
            const session = this.sessions[payload.sessionId];
            // Security: Check if ELITE
            const participant = Object.values(session?.participants || {}).find(p => p.id === socket.id);
            if (session && participant?.role === 'ELITE') {
                this.gameEngine.submitVote(session, socket.id, payload.vote); // Use socket.id as eliteId for now
                // Actually we should use participant.id if it differs, but above logic keeps them synced
            }
        });

        socket.on('submit_policy_choice', (payload: { sessionId: string, optionId: string }) => {
            const session = this.sessions[payload.sessionId];
            const participant = Object.values(session?.participants || {}).find(p => p.id === socket.id);
            if (session && participant?.role === 'LEADER') {
                this.gameEngine.handlePolicyDecision(session, payload.optionId);
            }
        });

        socket.on('send_chat', (payload: { sessionId: string, message: string }) => {
            const session = this.sessions[payload.sessionId];
            const participant = Object.values(session?.participants || {}).find(p => p.id === socket.id);

            // Only Elites, Only in DECISION phase
            if (session && participant?.role === 'ELITE' && session.currentPhase === GamePhase.DECISION) {
                // Broadcast to other elites
                // Efficient way: We don't have a room yet, let's filter. 
                // Better: Create room on role assignment.
                // For MVP: Filter and emit.
                const elites = Object.values(session.participants).filter(p => p.role === 'ELITE');
                elites.forEach(e => {
                    this.io.to(e.id).emit('chat_message', {
                        sender: participant.elitePosition || participant.name,
                        message: payload.message
                    });
                });
            }
        });

        socket.on('submit_protest', (payload: { sessionId: string, action: 'SILENT' | 'PROTEST' }) => {
            const session = this.sessions[payload.sessionId];
            const participant = Object.values(session?.participants || {}).find(p => p.id === socket.id);
            if (session && participant?.role === 'CITIZEN') {
                this.gameEngine.submitProtest(session, socket.id, payload.action);
            }
        });

        socket.on('accept_offer', (payload: { sessionId: string, offerId: string }) => {
            const session = this.sessions[payload.sessionId];
            const offer = session?.externalOffers.find(o => o.id === payload.offerId);
            if (offer && offer.recipientId === socket.id) {
                offer.accepted = true;
            }
        });
    }

    public handleDisconnect(socket: Socket) {
        // Handle disconnect logic, e.g., marking participant as disconnected
    }

    private createSession(socket: Socket) {
        const sessionId = uuidv4().slice(0, 6).toUpperCase(); // Short code for ease
        const newSession: Session = {
            id: sessionId,
            professorId: socket.id,
            joinLocked: false,
            participants: {},
            currentRound: 0,
            currentPhase: GamePhase.LOBBY,
            budget: 100,
            pressureIndex: 0,
            eliteVotes: {},
            citizenProtests: {},
            externalOffers: []
        };

        this.sessions[sessionId] = newSession;
        socket.join(sessionId); // Professor joins room
        socket.emit('session_created', { sessionId });
        console.log(`Session ${sessionId} created by ${socket.id}`);
    }

    private joinSession(socket: Socket, { sessionId, name, deviceId }: { sessionId: string; name: string; deviceId?: string }) {
        const session = this.sessions[sessionId];
        if (!session) {
            socket.emit('error', { message: 'Session not found' });
            return;
        }

        if (session.joinLocked) {
            // Check for reconnect using deviceId logic (TODO)
            socket.emit('error', { message: 'Joining is locked' });
            return;
        }

        const participantId = deviceId || uuidv4();

        // Check if already in (reconnect logic for basic cases)
        let participant = Object.values(session.participants).find(p => p.deviceId === deviceId);

        if (!participant) {
            participant = {
                id: socket.id, // Bind to current socket for now
                name,
                deviceId: participantId,
                connected: true,
                points: 0,
                timesLeader: 0,
                timesElite: 0,
                timesCitizen: 0
            };
            session.participants[participant.id] = participant;
        } else {
            // Reconnect update
            participant.id = socket.id;
            participant.connected = true;
        }

        socket.join(sessionId);
        socket.emit('joined', { sessionId, participantId: participant.id });

        // Notify professor
        this.io.to(sessionId).emit('participant_list', Object.values(session.participants));

        // Sync State on Reconnect/Late Join
        if (session.currentPhase !== GamePhase.LOBBY) {
            socket.emit('state_update', {
                phase: session.currentPhase,
                round: session.currentRound,
                allocation: session.lastAllocation, // Send recent data if needed
            });

            if (participant.role) {
                socket.emit('role_assigned', { role: participant.role, position: participant.elitePosition });
            }
        }
    }

    private lockSession(socket: Socket, sessionId: string) {
        const session = this.sessions[sessionId];
        if (!session || session.professorId !== socket.id) return;

        session.joinLocked = true;
        session.currentPhase = GamePhase.ROLE_ASSIGNMENT;

        // Assign Roles
        this.roleService.assignInitialRoles(session);

        this.io.to(sessionId).emit('game_started', {
            phase: session.currentPhase,
            participants: session.participants // In real game, filter what they see
        });

        // Send private role info
        Object.values(session.participants).forEach(p => {
            this.io.to(p.id).emit('role_assigned', { role: p.role, position: p.elitePosition });
        });
    }
}
