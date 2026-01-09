import { Session, Participant, Role } from '../types';

export class RoleService {
    private readonly ELITE_POSITIONS = [
        "Security Chief",
        "Defense Commander",
        "Finance Minister",
        "State Media Director",
        "Party Whip",
        "Interior Minister",
        "Intelligence Director"
    ];

    public assignInitialRoles(session: Session) {
        const participants = Object.values(session.participants);
        const totalPlayers = participants.length;

        if (totalPlayers === 0) return;

        // Shuffle participants
        const shuffled = this.shuffle(participants);

        // 1 Leader
        const leader = shuffled[0];
        leader.role = 'LEADER';
        leader.timesLeader++;

        // Calculate Elite Count
        let eliteCount = Math.round(totalPlayers / 4);
        eliteCount = Math.max(3, Math.min(7, eliteCount));

        // If class is too small (e.g. < 4), adjust but prompt specified min 3. 
        // We'll enforce min 3 unless total players is tiny.
        if (totalPlayers < 4) eliteCount = 0; // Or handle small test cases
        else if (eliteCount > totalPlayers - 1) eliteCount = totalPlayers - 1;

        // Assign Elites
        const elites = shuffled.slice(1, 1 + eliteCount);
        elites.forEach((p, index) => {
            p.role = 'ELITE';
            p.elitePosition = this.ELITE_POSITIONS[index % this.ELITE_POSITIONS.length];
            p.timesElite++;
        });

        // Assign Citizens
        const citizens = shuffled.slice(1 + eliteCount);
        citizens.forEach(p => {
            p.role = 'CITIZEN';
            p.timesCitizen++;
        });

        // Update map (though references are modified in place)
    }

    // Fisher-Yates shuffle
    private shuffle<T>(array: T[]): T[] {
        let currentIndex = array.length, randomIndex;
        while (currentIndex != 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]];
        }
        return array;
    }

    public reshuffleRoles(session: Session) {
        // Reset current roles but keep history
        const participants = Object.values(session.participants);
        // Ensure old leader is Citizen (already handled in ResolutionService if successful coup)
        // If leader survived, they stay leader usually? 
        // Spec says: "If leader survives, keep the same leader... unless professor enables rotate". 
        // Assuming leader changed or rotation forced if this is called.

        // Let's assume this is called when we need a NEW setup (e.g. after coup).
        // ResolutionService already picked new Leader if coup succeeded.
        // If coup failed, leader keeps role.

        // We need to re-select ELITES.

        const currentLeader = participants.find(p => p.role === 'LEADER');
        // Candidates for Elite = everyone except leader
        const candidates = participants.filter(p => p.role !== 'LEADER');

        // Determine Elite Count
        let eliteCount = Math.round(participants.length / 4);
        eliteCount = Math.max(3, Math.min(7, eliteCount));
        if (participants.length < 4) eliteCount = 0;
        else if (eliteCount > candidates.length) eliteCount = candidates.length;

        // Weighted Selection
        const selectedElites: Participant[] = [];

        // Helper to calculate weight
        const getWeight = (p: Participant) => {
            let w = 1;
            if (p.timesElite === 0) w += 2;
            if (p.timesElite === 1) w += 1;
            if (p.timesLeader >= 1) w -= 2;
            return Math.max(0.2, w);
        };

        for (let i = 0; i < eliteCount; i++) {
            if (candidates.length === 0) break;

            // Calculate weights for current candidates
            const weights = candidates.map(getWeight);
            const totalWeight = weights.reduce((a, b) => a + b, 0);
            let random = Math.random() * totalWeight;

            let selectedIndex = -1;
            for (let j = 0; j < candidates.length; j++) {
                random -= weights[j];
                if (random <= 0) {
                    selectedIndex = j;
                    break;
                }
            }
            // Fallback
            if (selectedIndex === -1) selectedIndex = 0;

            const selected = candidates.splice(selectedIndex, 1)[0];
            selectedElites.push(selected);
        }

        // Apply Roles
        // Clear old roles for candidates (now citizens by default)
        participants.forEach(p => {
            if (p.role !== 'LEADER') {
                p.role = 'CITIZEN';
                p.elitePosition = undefined;
            }
        });

        selectedElites.forEach((p, index) => {
            p.role = 'ELITE';
            p.elitePosition = this.ELITE_POSITIONS[index % this.ELITE_POSITIONS.length];
            p.timesElite++;
        });

        // Citizens are everyone else
        participants.filter(p => p.role === 'CITIZEN').forEach(p => p.timesCitizen++);
    }
}
