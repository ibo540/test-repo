export type Role = 'LEADER' | 'ELITE' | 'CITIZEN' | 'PROFESSOR';

export enum GamePhase {
    LOBBY = 'LOBBY',
    ROLE_ASSIGNMENT = 'ROLE_ASSIGNMENT',
    POLICY_DILEMMA = 'POLICY_DILEMMA',       // Leader chooses shock option
    ALLOCATION = 'ALLOCATION',               // Leader decides
    ALLOCATION_REVEAL = 'ALLOCATION_REVEAL', // Projector shows plan
    DECISION = 'DECISION',                   // Elites vote, Citizens protest, Chat/Offers active
    RESOLUTION = 'RESOLUTION',               // Coup outcome calculated
    ROUND_REPORT = 'ROUND_REPORT',           // Final results of round
    GAME_OVER = 'GAME_OVER'
}

export interface Participant {
    id: string; // socket.id or uuid
    name: string;
    role?: Role;
    deviceId: string; // for reconnect
    connected: boolean;
    // Game state specific to player
    elitePosition?: string; // e.g., "Defense Minister"
    points: number;
    // For weighting reshuffles
    timesLeader: number;
    timesElite: number;
    timesCitizen: number;
}

export interface Session {
    id: string;
    professorId?: string; // Socket ID of admin
    joinLocked: boolean;
    participants: Record<string, Participant>; // map id -> participant

    // Game State
    currentRound: number;
    currentPhase: GamePhase;
    phaseEndTime?: number; // timestamp for timer

    // Round Data
    budget: number;
    pressureIndex: number;

    // Round State (reset each round)
    allocation?: Allocation;
    eliteVotes: Record<string, 'LOYAL' | 'COUP'>;
    citizenProtests: Record<string, 'SILENT' | 'PROTEST'>;
    externalOffers: ExternalOffer[];

    // Outcomes
    lastRoundOutcome?: RoundOutcome;
}

export interface Allocation {
    coercionLevel: number; // 0-10
    publicSpending: number;
    privateRents: Record<string, number>; // eliteId -> amount
}

export interface ExternalOffer {
    id: string;
    recipientId: string;
    type: 'LEADERSHIP' | 'MONEY' | 'PROTECTION';
    description: string;
    accepted: boolean;
}

export interface RoundOutcome {
    coupAttempted: boolean;
    coupSuccess: boolean;
    coupProbability: number;
    protestRate: number;
    leaderRemoved: boolean;
    newLeaderId?: string;
    punishedElites: string[];
}
