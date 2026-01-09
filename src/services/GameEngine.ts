import { Server } from 'socket.io';
import { Session, GamePhase, Allocation, RoundOutcome } from '../types';
import { OfferService } from './OfferService';
import { ResolutionService } from './ResolutionService';
import { ScoringService } from './ScoringService';

export class GameEngine {
    private io: Server;
    private offerService: OfferService;
    private resolutionService: ResolutionService;
    private scoringService: ScoringService;

    // Phase Configuration
    private readonly PHASE_DURATIONS: Record<string, number> = {
        [GamePhase.POLICY_DILEMMA]: 0, // Waits for leader
        [GamePhase.ALLOCATION]: 0,
        [GamePhase.ALLOCATION_REVEAL]: 10000,
        [GamePhase.DECISION]: 120000,
        [GamePhase.RESOLUTION]: 10000,
        [GamePhase.ROUND_REPORT]: 0,
        [GamePhase.LOBBY]: 0,
        [GamePhase.ROLE_ASSIGNMENT]: 0,
        [GamePhase.GAME_OVER]: 0
    };

    constructor(io: Server) {
        this.io = io;
        this.offerService = new OfferService();
        this.resolutionService = new ResolutionService();
        this.scoringService = new ScoringService();
    }

    public startRound(session: Session) {
        session.currentRound++;

        // Pressure Escalation
        if (session.currentRound > 1) {
            session.pressureIndex++;
        }

        // Phase selection: Round 1 -> Allocation directly. Round 2+ -> Policy Dilemma.
        if (session.currentRound > 1) {
            session.currentPhase = GamePhase.POLICY_DILEMMA;
            // Generate Dilemma (Mock)
            // In real impl, store options in session
            const leader = Object.values(session.participants).find(p => p.role === 'LEADER');
            if (leader) {
                this.io.to(leader.id).emit('policy_dilemma', {
                    text: "Economic Crisis: Borrow or Austerity?",
                    options: [
                        { id: 'A', label: "Austerity (Budget -20)" },
                        { id: 'B', label: "Borrow (Next Round Budget -40)" }
                    ]
                });
            }
        } else {
            session.currentPhase = GamePhase.ALLOCATION;
            const leader = Object.values(session.participants).find(p => p.role === 'LEADER');
            if (leader) {
                this.io.to(leader.id).emit('start_allocation', { budget: session.budget });
            }
        }

        // Reset round state
        session.allocation = undefined;
        session.eliteVotes = {};
        session.citizenProtests = {};
        session.externalOffers = [];

        // Notify everyone
        this.emitState(session);
    }

    public handlePolicyDecision(session: Session, optionId: string) {
        // Apply effect (Mock)
        if (optionId === 'A') session.budget = 80;
        // Move to Allocation
        session.currentPhase = GamePhase.ALLOCATION;
        this.emitState(session);
        const leader = Object.values(session.participants).find(p => p.role === 'LEADER');
        if (leader) {
            this.io.to(leader.id).emit('start_allocation', { budget: session.budget });
        }
    }

    public async processAllocation(session: Session, allocation: Allocation) {
        if (session.currentPhase !== GamePhase.ALLOCATION) return;

        // Validation: Sum check
        const totalPrivate = Object.values(allocation.privateRents).reduce((a, b) => a + b, 0);
        const totalSpent = allocation.publicSpending + totalPrivate;

        // Allow tiny variance or exact? Let's be strict for now or allow under-spending (lost funds).
        if (totalSpent > session.budget) {
            // Error handling needed
            return false;
        }

        session.allocation = allocation;

        // Move to Reveal
        this.transitionTo(session, GamePhase.ALLOCATION_REVEAL);
    }

    public submitVote(session: Session, eliteId: string, vote: 'LOYAL' | 'COUP') {
        if (session.currentPhase !== GamePhase.DECISION) return;
        session.eliteVotes[eliteId] = vote;
        // Check if all voted? Or just wait for timer.
        // Usually wait for timer to hide timing attacks.
    }

    public submitProtest(session: Session, citizenId: string, action: 'SILENT' | 'PROTEST') {
        if (session.currentPhase !== GamePhase.DECISION) return;
        session.citizenProtests[citizenId] = action;
    }

    private transitionTo(session: Session, phase: GamePhase) {
        session.currentPhase = phase;
        session.phaseEndTime = Date.now() + (this.PHASE_DURATIONS[phase] || 0);

        this.emitState(session);

        if (phase === GamePhase.ALLOCATION_REVEAL) {
            setTimeout(() => this.transitionTo(session, GamePhase.DECISION), this.PHASE_DURATIONS[phase]);
        }
        else if (phase === GamePhase.DECISION) {
            // Generate Offers at start of Decision
            const elites = Object.values(session.participants).filter(p => p.role === 'ELITE');
            session.externalOffers = this.offerService.generateOffers(session.currentRound, elites, session.pressureIndex);

            // Send offers privately
            session.externalOffers.forEach(offer => {
                this.io.to(offer.recipientId).emit('external_offer', offer);
            });

            // Start timer for Resolution
            setTimeout(() => this.endDecisionPhase(session), this.PHASE_DURATIONS[phase]);
        }
    }

    private endDecisionPhase(session: Session) {
        // Trigger Resolution
        this.transitionTo(session, GamePhase.RESOLUTION);

        // Calculate Outcome
        const outcome: RoundOutcome = this.resolutionService.resolveRound(session);
        session.lastRoundOutcome = outcome;

        // Apply punishments/Leader change
        this.resolutionService.applyConsequences(session, outcome);

        // Calculate Points
        this.scoringService.calculatePoints(session);

        // Move to Report
        setTimeout(() => this.transitionTo(session, GamePhase.ROUND_REPORT), this.PHASE_DURATIONS[GamePhase.RESOLUTION]);
    }

    private emitState(session: Session) {
        // Mask private data for general broadcast
        const publicState = {
            round: session.currentRound,
            phase: session.currentPhase,
            phaseEndTime: session.phaseEndTime,
            allocation: session.currentPhase !== GamePhase.ALLOCATION ? session.allocation : null,
            // Don't send votes yet
        };
        this.io.to(session.id).emit('state_update', publicState);
    }
}
