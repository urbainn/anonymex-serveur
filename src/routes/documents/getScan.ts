import { Response } from 'express';
import { ErreurRequeteInvalide } from '../erreursApi';
import { MediaService } from '../../core/services/MediaService';
import { sessionCache } from '../../cache/sessions/SessionCache';

/**
 * Récupérer un scan et le renvoyer dans la réponse.
 */
async function getScan(res: Response, mediaDir: string, nomFichier: string): Promise<void> {
    const scanBuffer = await MediaService.lireMedia(mediaDir, nomFichier).catch(() => {
        throw new ErreurRequeteInvalide("Le scan n'existe pas.");
    });

    res.setHeader('Content-Type', 'image/webp');
    res.send(scanBuffer);
}

/**
 * Récupérer le scan d'un incident et le renvoyer dans la réponse.
 * @param idSession ID de la session de l'incident
 * @param idIncident
 */
export async function getScanIncident(idSession: string, idIncident: string, res: Response): Promise<void> {
    const incidentId = parseInt(idIncident, 10);
    const sessionId = parseInt(idSession, 10);

    // Vérifier que la session existe
    const session = await sessionCache.getOrFetch(sessionId);
    if (!session) {
        throw new ErreurRequeteInvalide("La session n'existe pas.");
    }

    const mediaDir = MediaService.getIncidentDir(sessionId);
    const nomFichier = `${incidentId}.webp`;

    await getScan(res, mediaDir, nomFichier);
}

/**
 * Récupérer le scan d'un bordereau déjà lu et le renvoyer dans la réponse.
 * @param idSession ID de la session de l'épreuve
 * @param codeEpreuve code de l'épreuve du bordereau
 * @param codeAnonymat code anonymat de la convocation associée au bordereau
 */
export async function getScanBordereau(idSession: string, codeEpreuve: string, codeAnonymat: string, res: Response): Promise<void> {
    const sessionId = parseInt(idSession, 10);

    // Vérifier que la session existe
    const session = await sessionCache.getOrFetch(sessionId);
    if (!session) {
        throw new ErreurRequeteInvalide("La session n'existe pas.");
    }

    const epreuve = await session.epreuves.getOrFetch(codeEpreuve);
    if (epreuve === undefined) {
        throw new ErreurRequeteInvalide("L'épreuve n'existe pas.");
    }

    const mediaDir = MediaService.getExamScansDir(sessionId, codeEpreuve);
    const nomFichier = `${codeAnonymat}.webp`;

    await getScan(res, mediaDir, nomFichier);
}