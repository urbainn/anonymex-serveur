import { Response } from 'express';
import { ErreurRequeteInvalide } from '../erreursApi';
import { MediaService } from '../../core/services/MediaService';

/**
 * Retourne le scan d'un incident donné (si il existe).
 * @param idIncident l'id de l'incident
 */
export async function getScanIncident(idIncident: string, res: Response): Promise<void> {
    const idIncidentNormalise = idIncident?.trim() ?? '';
    const idIncidentNum = Number(idIncidentNormalise);

    if (!Number.isInteger(idIncidentNum) || idIncidentNum < 0 || idIncidentNormalise === '') {
        throw new ErreurRequeteInvalide("L'ID d'incident n'est pas valide.");
    }

    const scanBuffers = await MediaService.lireMedia('incidents/', `${idIncidentNum}.webp`).catch(() => {
        throw new ErreurRequeteInvalide("Le scan de l'incident n'existe pas.");
    });

    const scanBuffer = scanBuffers[0];
    if (!scanBuffer) {
        throw new ErreurRequeteInvalide("Le scan de l'incident n'existe pas.");
    }

    res.setHeader('Content-Type', 'image/webp');
    res.send(scanBuffer);
}