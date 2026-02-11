import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { logInfo, styles } from '../../../utils/logger';
import { CadreEtudiantBenchmarkModule } from './modules/cadre-etudiant/CadreEtudiantBenchmarkModule';
import { ErreurAprilTag } from '../generationErreurs';
import { genererCiblesConcentriques } from '../common/genererCiblesConcentriques';
import { BenchmarkUnitaireModule } from './modules/cadre-etudiant/BenchmarkUnitaireModule';

export interface BordereauAnonProprietes {
    format: 'A4' | 'A5';
    /** Nb. de caractères dans le code d'anonymat (inclus la somme de contrôle) */
    longueurCodeAnonymat: number;
    /** Nb. de caractères dans le code d'épreuve (ou 0 si non généré) */
    longueurCodeEpreuve: number;
    /** Version du bordereau, pour gestion future */
    version: 1;
}

export function genererBordereau(proprietes: BordereauAnonProprietes): boolean {

    logInfo('genererBordereau', 'Génération d\'un bordereau..');
    const debutMs = Date.now();

    const doc = new PDFDocument({
        size: proprietes.format,
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    doc.pipe(createWriteStream('bordereau_test.pdf'));

    try {
        genererCiblesConcentriques(doc, 8, 10);
    } catch (error) {
        throw ErreurAprilTag.assigner(error);
    }

    new BenchmarkUnitaireModule().generer(doc);

    doc.end();
    logInfo('genererBordereau', 'Bordereau généré avec succès. ' + styles.dim + `(en ${Date.now() - debutMs} ms)`);

    // note, l'objectif sera de renvoyer un stream via http (pipé dans la response) contenant le pdf généré, sans stockage local
    // pour l'instant on utilise le stockage local pour le développement
    return false;
}