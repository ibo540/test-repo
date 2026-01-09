import { Session, RoundOutcome, Participant } from '../types';

export class ResolutionService {
    public resolveRound(session: Session): RoundOutcome {
        const eliteCount = Object.values(session.participants).filter(p => p.role === 'ELITE').length;
        const votes = Object.values(session.eliteVotes);
        const coupVotes = votes.filter(v => v === 'COUP').length;

        const attemptTriggered = coupVotes >= Math.ceil(eliteCount / 2);

        let coupSuccess = false;
        let probability = 0;

        if (attemptTriggered) {
            const voteShare = coupVotes / eliteCount;
            // Baseline: 50% share -> 35%, 100% share -> 95%
            probability = (voteShare * 100) - 15;

            // Adjust for protests (mock for now)
            const protestors = Object.values(session.citizenProtests).filter(a => a === 'PROTEST').length;
            const totalCitizens = Object.values(session.participants).filter(p => p.role === 'CITIZEN').length;
            const protestRate = totalCitizens > 0 ? protestors / totalCitizens : 0;

            if (protestRate > 0.6) probability += 10;

            probability = Math.max(5, Math.min(95, probability));

            const roll = Math.random() * 100;
            coupSuccess = roll < probability;
        }

        return {
            coupAttempted: attemptTriggered,
            coupSuccess,
            coupProbability: probability,
            protestRate: 0, // Calculate properly above
            leaderRemoved: coupSuccess,
            punishedElites: []
        };
    }

    public applyConsequences(session: Session, outcome: RoundOutcome) {
        const coupVoters = Object.entries(session.eliteVotes)
            .filter(([_, vote]) => vote === 'COUP')
            .map(([id]) => id);

        if (outcome.coupSuccess) {
            // Remove current leader
            const currentLeader = Object.values(session.participants).find(p => p.role === 'LEADER');
            if (currentLeader) {
                currentLeader.role = 'CITIZEN';
                currentLeader.timesCitizen++;
            }

            // Select new leader
            let newLeaderId: string | undefined;

            // Priority 1: Elite with accepted LEADERSHIP offer
            const promiseHolder = session.externalOffers.find(o =>
                o.type === 'LEADERSHIP' && o.accepted && coupVoters.includes(o.recipientId)
            );

            if (promiseHolder) {
                newLeaderId = promiseHolder.recipientId;
            } else if (coupVoters.length > 0) {
                // Priority 2: Random Coup Voter
                newLeaderId = coupVoters[Math.floor(Math.random() * coupVoters.length)];
            } else {
                // Fallback: Random Elite? Or Citizen? Should not happen if coup succeeded (implies voters)
                // Just pick random remaining elite
                const elites = Object.values(session.participants).filter(p => p.role === 'ELITE');
                if (elites.length > 0) newLeaderId = elites[0].id;
            }

            if (newLeaderId) {
                const newLeader = session.participants[newLeaderId];
                if (newLeader) {
                    newLeader.role = 'LEADER';
                    newLeader.timesLeader++;
                    newLeader.elitePosition = undefined; // Clear old position
                    outcome.newLeaderId = newLeaderId;
                }
            }
        } else if (outcome.coupAttempted) {
            // Failed coup - punish
            coupVoters.forEach(eliteId => {
                // Base 40% chance + Coercion impact (5% per level)
                const coercion = session.allocation?.coercionLevel || 0;
                let prob = 40 + (coercion * 5);

                // Protection offer check
                const protectedUser = session.externalOffers.find(o =>
                    o.recipientId === eliteId && o.type === 'PROTECTION' && o.accepted
                );
                if (protectedUser) prob -= 30;

                prob = Math.max(5, Math.min(90, prob));

                if (Math.random() * 100 < prob) {
                    const elite = session.participants[eliteId];
                    if (elite) {
                        elite.role = 'CITIZEN'; // Demotion
                        elite.elitePosition = undefined;
                        elite.timesCitizen++; // Mark as demoted
                        outcome.punishedElites.push(eliteId);
                    }
                }
            });
        }
    }
}
