import { ExternalOffer, Participant } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class OfferService {
    public generateOffers(round: number, elites: Participant[], pressure: number): ExternalOffer[] {
        const offers: ExternalOffer[] = [];

        // Example logic: Select subset based on pressure
        // For MVP: random 1-2 elites
        const numRecipients = Math.max(1, Math.round(elites.length / 2));

        // Shuffle elites
        const potential = [...elites].sort(() => 0.5 - Math.random());
        const recipients = potential.slice(0, numRecipients);

        recipients.forEach(p => {
            offers.push({
                id: uuidv4(),
                recipientId: p.id,
                type: 'MONEY', // Vary this later
                description: 'External powers offer you 10 points if you support a coup.',
                accepted: false
            });
        });

        return offers;
    }
}
