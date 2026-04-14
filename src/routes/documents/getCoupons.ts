import { Response } from 'express';
import { ErreurRequeteInvalide } from '../erreursApi';
import { sessionCache } from '../../cache/sessions/SessionCache';
import { genererDocCoupons } from '../../core/generation/coupon/genererDocCoupons';
import { EpreuveStatut } from '../../contracts/epreuves';

/**
 * Génère (et stream dans la response) les coupons d'identification pour une épreuve donnée.
 * @param sessionId id de la session d'examen
 * @param codeEpreuve
 * @param salles liste des codes de salles pour lesquelles générer les coupons (ex: ['SALLE1', 'SALLE2'])
 * @param codesAno liste de codes d'anonymat pour lesquels afficher les coupons : ne génère pas les feuilles spécifiques aux salles.
 */
export async function getCoupons(sessionId: string, codeEpreuve: string, codesAno: string[], salles: string[], res: Response): Promise<void> {
    const idSession = parseInt(sessionId ?? '');

    if (isNaN(idSession) || sessionId === undefined) {
        throw new ErreurRequeteInvalide("L'ID de session n'est pas valide.");
    }

    const session = await sessionCache.getOrFetch(idSession);
    if (session === undefined) throw new ErreurRequeteInvalide("La session demandée n'existe pas.");

    const epreuve = await session.epreuves.getOrFetch(codeEpreuve);
    if (epreuve === undefined) throw new ErreurRequeteInvalide("L'épreuve demandée n'existe pas.");

    if (salles.length > 0 && codesAno.length > 0) {
        throw new ErreurRequeteInvalide("Les paramètres 'salles' et 'codesAno' ne peuvent pas être utilisés en même temps.");
    }

    if (epreuve.statut === EpreuveStatut.MATERIEL_NON_IMPRIME) {
        await epreuve.changerStatut(EpreuveStatut.MATERIEL_IMPRIME);
        session.epreuves.update(epreuve.codeEpreuve, { statut: EpreuveStatut.MATERIEL_IMPRIME });
    }

    genererDocCoupons(session, epreuve, salles, codesAno, res);
}