import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { genererAprilTags } from './genererAprilTags';

export interface BordereauAnonProprietes {
    format: 'A4' | 'A5';
    /** Nb. de caractères dans le code d'anonymat (inclus la somme de contrôle) */
    longueurCodeAnonymat: number;
    /** Nb. de caractères dans le code d'épreuve (ou 0 si non généré) */
    longueurCodeEpreuve: number;
    /** Version du bordereau, pour gestion future */
    version: 1;
}

export default function genererBordereau(proprietes: BordereauAnonProprietes): boolean {

    const doc = new PDFDocument({
        size: proprietes.format
    });

    doc.pipe(createWriteStream('bordereau_test.pdf'));

    genererAprilTags(doc, 10, 25);

    doc.end();
    console.log('Bordereau généré.');

    // note, l'objectif sera de renvoyer un stream via http (pipé dans la response) contenant le pdf généré, sans stockage local
    // pour l'instant on utilise le stockage local pour le développement
    return false;
}