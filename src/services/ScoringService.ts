import { Session, Participant } from '../types';

export class ScoringService {
    public calculatePoints(session: Session) {
        if (!session.allocation) return;

        const { publicSpending, privateRents } = session.allocation;

        // Private Rents: 1 point per 1 NBU
        Object.entries(privateRents).forEach(([eliteId, amount]) => {
            const elite = session.participants[eliteId];
            if (elite) {
                elite.points += amount;
            }
        });

        // Public Spending
        // Noise: +/- 10%
        const noise = (Math.random() * 0.2) + 0.9; // 0.9 to 1.1 multiplier
        const publicValue = publicSpending * noise;

        const citizens = Object.values(session.participants).filter(p => p.role === 'CITIZEN');
        const elites = Object.values(session.participants).filter(p => p.role === 'ELITE');

        citizens.forEach(p => {
            p.points += publicValue * 0.2; // 0.2 per NBU
        });

        elites.forEach(p => {
            p.points += publicValue * 0.05; // 0.05 per NBU
        });
    }
}
