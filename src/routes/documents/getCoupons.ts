import { Response } from 'express';
import { ErreurRequeteInvalide } from '../erreursApi';
import { sessionCache } from '../../cache/sessions/SessionCache';
import { genererDocCoupons } from '../../core/generation/coupon/genererDocCoupons';

/**
 * Génère (et stream dans la response) les coupons d'identification pour une épreuve donnée.
 * @param sessionId id de la session d'examen
 * @param codeEpreuve
 * @param salles liste des codes de salles pour lesquelles générer les coupons (ex: ['SALLE1', 'SALLE2'])
 */
export async function getCoupons(sessionId: string, codeEpreuve: string, salles: string[], res: Response): Promise<void> {
    const idSession = parseInt(sessionId ?? '');

    if (isNaN(idSession) || sessionId === undefined) {
        throw new ErreurRequeteInvalide("L'ID de session n'est pas valide.");
    }

    const session = await sessionCache.getOrFetch(idSession);
    if (session === undefined) throw new ErreurRequeteInvalide("La session demandée n'existe pas.");

    const epreuve = await session.epreuves.getOrFetch(codeEpreuve);
    if (epreuve === undefined) throw new ErreurRequeteInvalide("L'épreuve demandée n'existe pas.");

    genererDocCoupons(session, epreuve, res);
}