import { sessionCache } from "../../cache/sessions/SessionCache";
import { EpreuveStatut } from "../../contracts/epreuves";
import { creerGenererCouponsSupplementaires } from "../../core/generation/coupon/genererCouponsSupplementaires";
import { ErreurRequeteInvalide } from "../erreursApi";
import { Response } from "express";

/**
 * Créé puis génère (et stream dans la response) de nouvelles convocations supplémentaires pour une épreuve et une salle donnée.
 * @param sessionId id de la session d'examen
 * @param codeEpreuve
 * @param salle code de la salle pour laquelle générer les coupons supplémentaires
 * @param nbCoupons nombre de coupons supplémentaires à générer
 */
export async function getCreerCouponsSupplementaires(sessionId: string, codeEpreuve: string, salle: string, nbCoupons: number, res: Response): Promise<void> {
    const idSession = parseInt(sessionId ?? '');

    if (isNaN(idSession) || sessionId === undefined) {
        throw new ErreurRequeteInvalide("L'ID de session n'est pas valide.");
    }

    if (isNaN(nbCoupons) || nbCoupons <= 0) {
        throw new ErreurRequeteInvalide("Le nombre de coupons à générer doit être un entier positif.");
    }

    const session = await sessionCache.getOrFetch(idSession);
    if (session === undefined) throw new ErreurRequeteInvalide("La session demandée n'existe pas.");

    const epreuve = await session.epreuves.getOrFetch(codeEpreuve);
    if (epreuve === undefined) throw new ErreurRequeteInvalide("L'épreuve demandée n'existe pas.");

    if (epreuve.statut === EpreuveStatut.MATERIEL_NON_IMPRIME) {
        await epreuve.changerStatut(EpreuveStatut.MATERIEL_IMPRIME);
        session.epreuves.update(epreuve.codeEpreuve, { statut: EpreuveStatut.MATERIEL_IMPRIME });
    }

    await creerGenererCouponsSupplementaires(session, epreuve, salle, nbCoupons, res);
}