import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { Epreuve } from '../../../cache/epreuves/Epreuve';
import { Session } from '../../../cache/sessions/Session';
import 'dayjs/locale/fr';
import { etudiantCache } from '../../../cache/etudiants/EtudiantCache';
import { Convocation } from '../../../cache/epreuves/convocations/Convocation';
import { salleCache } from '../../../cache/salles/SalleCache';
import { renduPlancheCodesSupplementaires } from './renduPlancheCodesSupplementaires';
import { renduCoupon } from './renduCoupon';
import { appliquerDecalage, getDecalages } from '../../../utils/codeAnonymatUtils';
import { config } from '../../../config';

/**
 * Créer puis générer des coupons supplémentaires EN PLUS de ceux générés par défaut
 * @param salle code salle pour laquelle générer les coupons supplémentaires
 * @param nbCoupons nombre de coupons supplémentaires à générer
 * @returns true si la génération s'est correctement déroulée
 */
export async function creerGenererCouponsSupplementaires(session: Session, epreuve: Epreuve, salle: string, nbCoupons: number, res: Response): Promise<boolean> {

    const doc = new PDFDocument({
        size: "A4",
        autoFirstPage: false,
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    doc.pipe(res);

    // Mettre à jour les caches
    await etudiantCache.getAll();
    await salleCache.getAll();

    if (salleCache.get(salle) === undefined) {
        throw new Error(`La salle ${salle} n'existe pas`);
    }

    // Récupérer tous les codes effectifs (3 premiers symboles) déjà existants 
    const codesEffectifsSupp = new Set<string>();
    for (const convoc of epreuve.convocations.convocationsSupplementaires.values()) {
        codesEffectifsSupp.add(convoc.codeAnonymat.substring(0, 3));
    }

    const nouvellesConvocsSupp = [];

    // Générer n coupons supplémentaires avec un code effectif unique
    const alphabet = config.codesAnonymat.alphabetCodeAnonymat;
    for (let i = 0; i < nbCoupons; i++) {
        let codeEffectif;
        let essaiNb = 0;
        // Générer le code suivant jusqu'à trouver un code effectif non utilisé (en préfixe du code anonymat)
        do {
            codeEffectif = 'Z' + alphabet.charAt(essaiNb % alphabet.length) + alphabet.charAt(Math.floor(essaiNb / alphabet.length) % alphabet.length);
            essaiNb++;
        } while (codesEffectifsSupp.has(codeEffectif));

        // Créer la convocation
        codesEffectifsSupp.add(codeEffectif);
        const decalageEpreuve = getDecalages(epreuve.idDecalage, alphabet);
        const codeAnonymat = codeEffectif + appliquerDecalage(codeEffectif, decalageEpreuve, alphabet);
        const nouvelleConvocData = {
            id_session: session.id,
            code_epreuve: epreuve.codeEpreuve,
            numero_etudiant: null,
            note_quart: null,
            code_salle: salle,
            rang: null,
            code_anonymat: codeAnonymat
        };
        const convocationSupp = new Convocation(nouvelleConvocData);
        await epreuve.convocations.insert(nouvelleConvocData, convocationSupp);

        nouvellesConvocsSupp.push(convocationSupp);
    }

    // Générer les pages de coupons
    renduPlancheCodesSupplementaires(doc, epreuve, salle, nouvellesConvocsSupp);

    // Générer les coupons pour les convocations supplémentaires
    for (const convocSupp of nouvellesConvocsSupp) {
        await renduCoupon(doc, epreuve, convocSupp, salleCache.get(salle));
    }

    doc.end();
    return true;

}
