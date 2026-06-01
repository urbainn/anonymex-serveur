import { Response } from 'express';
import { ErreurRequeteInvalide } from '../erreursApi';
import { sessionCache } from '../../cache/sessions/SessionCache';
import { genererDocCouponsAvecScans } from '../../core/generation/coupon/genererDocCouponsAvecScans';
import { EpreuveStatut } from '../../contracts/epreuves';

/**
 * Génère (et stream dans la response) les coupons avec les scans intercalés pour une épreuve donnée.
 * @param sessionId id de la session d'examen
 * @param codeEpreuve
 * @param codesAno liste de codes d'anonymat pour lesquels afficher les coupons et scans
 */
export async function getCouponsAvecScans(sessionId: string, codeEpreuve: string, codesAno: string[], res: Response): Promise<void> {
    const idSession = parseInt(sessionId ?? '');

    if (isNaN(idSession) || sessionId === undefined) {
        throw new ErreurRequeteInvalide("L'ID de session n'est pas valide.");
    }

    const session = await sessionCache.getOrFetch(idSession);
    if (session === undefined) throw new ErreurRequeteInvalide("La session demandée n'existe pas.");

    const epreuve = await session.epreuves.getOrFetch(codeEpreuve);
    if (epreuve === undefined) throw new ErreurRequeteInvalide("L'épreuve demandée n'existe pas.");

    if (codesAno.length === 0) {
        throw new ErreurRequeteInvalide("Aucun code d'anonymat fourni.");
    }

    if (epreuve.statut === EpreuveStatut.MATERIEL_NON_IMPRIME) {
        await epreuve.changerStatut(EpreuveStatut.MATERIEL_IMPRIME);
        session.epreuves.update(epreuve.codeEpreuve, { statut: EpreuveStatut.MATERIEL_IMPRIME });
    }

    genererDocCouponsAvecScans(session, epreuve, codesAno, res);
}
