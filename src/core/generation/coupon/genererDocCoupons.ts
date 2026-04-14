import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { Epreuve } from '../../../cache/epreuves/Epreuve';
import { Session } from '../../../cache/sessions/Session';
import 'dayjs/locale/fr';
import { etudiantCache } from '../../../cache/etudiants/EtudiantCache';
import { Convocation } from '../../../cache/epreuves/convocations/Convocation';
import { renduFeuilleSalle } from './renduFeuilleSalle';
import { salleCache } from '../../../cache/salles/SalleCache';
import { renduPlancheCodesSupplementaires } from './renduPlancheCodesSupplementaires';
import { renduCoupon } from './renduCoupon';

/**
 * Génère (et stream dans la response) le matériel d'examen pour une épreuve (coupons et planches des codes supplémentaires)
 * @returns true si la génération s'est correctement déroulée
 */
export async function genererDocCoupons(session: Session, epreuve: Epreuve, salles: string[], codesAno: string[], res: Response): Promise<boolean> {

    const doc = new PDFDocument({
        size: "A4",
        autoFirstPage: false,
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    doc.pipe(res);

    // Générer le matériel spécifique aux salles ?
    const genererFeuillesSalles = codesAno.length === 0;

    // Mettre à jour les caches
    await etudiantCache.getAll();
    await salleCache.getAll();
    const convocs = await epreuve.convocations.getAll();

    // Mapping des convocations par salle
    const convocsSalles = new Map<string, Convocation[]>();
    const convocsSupp = new Map<string, Convocation[]>();

    // Répartir les convocations dans les différentes salles
    for (const convocation of convocs) {
        // Filtre des étudiants actif : vérifier si la convocation est demandée
        if (codesAno.length > 0 && !codesAno.includes(convocation.codeAnonymat)) {
            continue;
        }

        const c = convocsSalles.get(convocation.codeSalle);
        if (!c) convocsSalles.set(convocation.codeSalle, [convocation]);
        else c.push(convocation);
    }

    // Répartir les convocs supplémentaires (sauf si filtre étudiant actif)
    if (codesAno.length === 0) {
        for (const convocSupp of epreuve.convocations.convocationsSupplementaires.values()) {
            const c = convocsSupp.get(convocSupp.codeSalle);
            if (!c) convocsSupp.set(convocSupp.codeSalle, [convocSupp]);
            else c.push(convocSupp);
        }
    }

    // Générer les pages de coupons
    for (const [codeSalle, convocs] of convocsSalles.entries()) {
        if (!salles.includes(codeSalle) && salles.length > 0) continue; // ne générer que pour les salles demandées
        const salle = salleCache.get(codeSalle);
        const convocsSupplementaires = convocsSupp.get(codeSalle) ?? [];

        if (genererFeuillesSalles) {

            // Générer page de séparation/présentation
            await renduFeuilleSalle(doc, epreuve, convocs.length, convocsSupplementaires.length, codeSalle);

            // Générer la planche de codes supplémentaires pour la salle
            renduPlancheCodesSupplementaires(doc, epreuve, codeSalle, convocsSupplementaires);

        }

        // Générer les coupons pour les convocations
        for (const convocation of convocs) {
            console.log('Génération coupon pour convocation : ', convocation.codeAnonymat);
            await renduCoupon(doc, epreuve, convocation, salle);
        }

        // Générer les coupons pour les convocations supplémentaires
        for (const convocSupp of convocsSupplementaires) {
            await renduCoupon(doc, epreuve, convocSupp, salle);
        }
    }

    doc.end();
    return true;

}
