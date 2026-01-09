import { SessionManager } from './services/SessionManager'; // Adjust this if we can't import SessionManager easily without IO
import { Session, GamePhase, Allocation } from './types';
import { RoleService } from './services/RoleService';
import { GameEngine } from './services/GameEngine';
import { Server } from 'socket.io'; // We'll mock this

// Mock Socket.IO
const mockIo = {
    to: (room: string) => ({
        emit: (event: string, data: any) => console.log(`[IO: ${room}] ${event}:`, JSON.stringify(data).slice(0, 100) + '...')
    }),
    emit: (event: string, data: any) => console.log(`[IO: Global] ${event}:`, data)
} as unknown as Server;

// Setup
const roleService = new RoleService();
const gameEngine = new GameEngine(mockIo);
const session: Session = {
    id: 'TEST01',
    joinLocked: true,
    participants: {},
    currentRound: 0,
    currentPhase: GamePhase.LOBBY,
    budget: 100,
    pressureIndex: 0,
    eliteVotes: {},
    citizenProtests: {},
    externalOffers: []
};

// 1. Add Participants (20 players)
console.log('--- Adding Participants ---');
for (let i = 0; i < 20; i++) {
    session.participants[`p${i}`] = {
        id: `p${i}`,
        name: `Player ${i}`,
        deviceId: `d${i}`,
        connected: true,
        points: 0,
        timesLeader: 0,
        timesElite: 0,
        timesCitizen: 0
    };
}

// 2. Assign Roles
console.log('--- Assigning Roles ---');
roleService.assignInitialRoles(session);
const leader = Object.values(session.participants).find(p => p.role === 'LEADER');
console.log('Leader:', leader?.name);
const elites = Object.values(session.participants).filter(p => p.role === 'ELITE');
console.log('Elites:', elites.length, elites.map(e => e.elitePosition));

// 3. Start Round
console.log('--- Starting Round 1 ---');
gameEngine.startRound(session);

// 4. Allocation
console.log('--- Leader Allocating ---');
const allocation: Allocation = {
    coercionLevel: 2,
    publicSpending: 40,
    privateRents: {}
};
elites.forEach(e => allocation.privateRents[e.id] = 10); // 60 total rents if 6 elites?
// Budget 100. 40 public + (approx 5-6 elites * 10) = ~90-100. 
gameEngine.processAllocation(session, allocation);

// 5. Decision Phase (Simulate timer end logic manually)
console.log('--- Decision Phase ---');
// gameEngine sets offers internally on transition to Decision. 
// We manually trigger transition for simulation
// Private method access hack or just Simulate
session.currentPhase = GamePhase.DECISION;
// Mock Votes
elites.forEach((e, idx) => {
    const vote = idx < 3 ? 'COUP' : 'LOYAL';
    gameEngine.submitVote(session, e.id, vote);
    console.log(`Elite ${e.name} voted ${vote}`);
});

// 6. Resolution
console.log('--- Resolution ---');
// Manually calling private method logic via public interface? 
// GameEngine doesn't expose resolve directly.
// We'll mimic the endDecisionPhase logic
const resolutionService = (gameEngine as any).resolutionService;
const outcome = resolutionService.resolveRound(session);
console.log('Outcome:', outcome);

// 7. Apply Consequences
console.log('--- Consequences ---');
resolutionService.applyConsequences(session, outcome);
const scoringService = (gameEngine as any).scoringService;
scoringService.calculatePoints(session);

console.log('Leader Removed?', outcome.leaderRemoved);
console.log('New Leader ID:', outcome.newLeaderId);
console.log('Leader Points:', leader?.points); // Should have rent points if assigned to self? Leader usually keeps rest? 
// Spec didn't say leader keeps rest. Spec says "Leader receives fixed budget... allocates... strict sum constraint".
// My impl didn't check if Leader keeps remainder. Usually they do.
// Assuming Leader allocates to SELF as well? Or Rents are for Elites only?
// "Private Rents, assigned to specific named elites."
// Leader payoff? "You need a simple payoff system... Private rents... each 1 NBU yields 1 point."
// Leader probably allocates to self or has a base salary. 
// Current rules don't specify Leader Payoff! I should probably add that or assume Leader takes what they want?
// "Leader allocates budget with a strict sum constraint."
// If Leader doesn't allocate to self, they get 0?
// I'll assume Leader can allocate to self (is a participant) or adds "Leader Salary" item.
// For now, Leader gets nothing explicitly in my code unless they assign rent to themselves (they are not "Elite" role).
// Resolution: Leader needs points.
// FIX: Add "Leader Revenue" = Budget - Spent? Or allocate to self.
// Spec: "Leader receives a fixed national budget... allocates it... Private Rents... Public Spending".
// Usually in these games, Unspent = Leader Personal Wealth.
// I'll assume that for now.

console.log('Simulation Complete');
