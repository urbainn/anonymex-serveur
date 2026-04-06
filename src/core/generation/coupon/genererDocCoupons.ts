import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { Epreuve } from '../../../cache/epreuves/Epreuve';
import { Session } from '../../../cache/sessions/Session';
import 'dayjs/locale/fr';
import { etudiantCache } from '../../../cache/etudiants/EtudiantCache';

/**
 * Génère (et stream dans la response) le matériel d'examen pour une épreuve (coupons et planches des codes supplémentaires)
 * @returns true si la génération s'est correctement déroulée
 */
export async function genererDocCoupons(session: Session, epreuve: Epreuve, res: Response): Promise<boolean> {

    const doc = new PDFDocument({
        size: "A4",
        autoFirstPage: true,
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    doc.pipe(res);

    // Mettre tous les étudiants en cache
    await etudiantCache.getAll();


    doc.end();
    return true;

}
