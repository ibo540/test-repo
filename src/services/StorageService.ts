
import fs from 'fs';
import path from 'path';
import { Session, Allocation, Participant } from '../types';

interface DB {
    sessions: Record<string, any>; // Persistent session meta
    round_roles: any[]; // { sessionId, round, participantId, role, position }
    round_allocations: any[]; // { sessionId, round, leaderId, allocation }
}

export class StorageService {
    private dbPath = path.join(process.cwd(), 'data', 'database.json');
    private db: DB = {
        sessions: {},
        round_roles: [],
        round_allocations: []
    };

    constructor() {
        this.load();
    }

    private load() {
        try {
            if (fs.existsSync(this.dbPath)) {
                this.db = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
            } else {
                this.save();
            }
        } catch (e) {
            console.error("Failed to load DB", e);
            this.db = { sessions: {}, round_roles: [], round_allocations: [] };
        }
    }

    private save() {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(this.db, null, 2));
        } catch (e) {
            console.error("Failed to save DB", e);
        }
    }

    // --- Sessions ---
    public saveSession(session: Session) {
        this.db.sessions[session.id] = {
            id: session.id,
            currentRound: session.currentRound,
            currentPhase: session.currentPhase,
            budget: session.budget
        };
        this.save();
    }

    // --- Roles ---
    public saveRoles(sessionId: string, round: number, participants: Record<string, Participant>) {
        // Clear existing for this round/session if any (upsert logic)
        this.db.round_roles = this.db.round_roles.filter(r => !(r.sessionId === sessionId && r.round === round));

        Object.values(participants).forEach(p => {
            this.db.round_roles.push({
                sessionId,
                round,
                participantId: p.id,
                name: p.name,
                role: p.role,
                elitePosition: p.elitePosition
            });
        });
        this.save();
    }

    public getRoles(sessionId: string, round: number) {
        return this.db.round_roles.filter(r => r.sessionId === sessionId && r.round === round);
    }

    // --- Allocations ---
    public saveAllocation(sessionId: string, round: number, leaderId: string, allocation: Allocation) {
        // Remove existing
        this.db.round_allocations = this.db.round_allocations.filter(a => !(a.sessionId === sessionId && a.round === round));

        this.db.round_allocations.push({
            sessionId,
            round,
            leaderId,
            allocation,
            timestamp: Date.now()
        });
        this.save();
        console.log(`[DB] Saved allocation for ${sessionId} Round ${round}`);
    }

    public getAllocation(sessionId: string, round: number) {
        const entry = this.db.round_allocations.find(a => a.sessionId === sessionId && a.round === round);
        return entry ? entry.allocation : null;
    }
}
