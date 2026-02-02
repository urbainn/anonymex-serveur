import { logInfo, styles } from "../../../utils/logger";
import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { genererCiblesConcentriques } from "../common/genererCiblesConcentriques";
import { ErreurAprilTag } from "../generationErreurs";
import { mmToPoints } from "../../../utils/pdfUtils";
import { renduEnteteEmargement } from "./renduEnteteEmargement";
import { sessionCache } from "../../../cache/sessions/SessionCache";
import { Session } from "../../../cache/sessions/Session";
import { Epreuve } from "../../../cache/epreuves/Epreuve";
import { renduEnteteTableauEmargement, renduLigneEmargement, renduTableauEmargement } from "./renduTableauEmargement";
import { Etudiant } from "../../../cache/etudiants/Etudiant";
import { renduPiedPageEmargement } from "./renduPiedPageEmargement";

const LIGNES_PAR_PAGE = 28;
const MARGE_HORIZONTALE = mmToPoints(10 /* mm */);

export interface FeuilleEmargementProprietes {
    noms: [string, string][];
    version: 1;
}

export function genererFeuilleEmargement(proprietes: FeuilleEmargementProprietes): boolean {
    logInfo('genererEmargement', 'Génération d\'une feuille d\'émargement..');
    const debutMs = Date.now();

    // Calculer la taille de chaque ligne de la feuille d'émargement

    // Initialiser le PDF
    const doc = new PDFDocument({ size: 'A4', autoFirstPage: false, margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    doc.pipe(createWriteStream('emargement_test.pdf'));

    // Rendu des pages
    const nbPages = Math.ceil(proprietes.noms.length / LIGNES_PAR_PAGE);
    let pageIndex = 0;
    while (pageIndex < nbPages) {

        // Nouvelle page sauf pour la première (crée automatiquement)
        doc.addPage();

        // Couper les n premiers noms pour cette page
        const nomsPage = proprietes.noms.slice(pageIndex * LIGNES_PAR_PAGE, (pageIndex + 1) * LIGNES_PAR_PAGE);
        renduPageEmargement(doc, nomsPage, pageIndex + 1, nbPages);
        pageIndex++;
    }


    doc.end();
    logInfo('genererEmargement', 'Feuille d\'émargement générée avec succès. ' + styles.dim + `(en ${Date.now() - debutMs} ms)`);

    // note, l'objectif sera de renvoyer un stream via http (pipé dans la response) contenant le pdf généré, sans stockage local
    // pour l'instant on utilise le stockage local pour le développement
    return false;

}

function renduPageEmargement(doc: typeof PDFDocument, noms: [string, string][], numPage: number, pagesTotal: number): typeof PDFDocument {
    const ciblesMargeMm = 5;
    const ciblesTailleMm = 7;

    // Limites de la zone de lecture
    const hauteurZoneCiblesMm = ciblesMargeMm + ciblesTailleMm + 15;
    const hauteurLigneMm = (297 - 2 * hauteurZoneCiblesMm) / (LIGNES_PAR_PAGE + 1);
    const positionYDepartMm = hauteurZoneCiblesMm + hauteurLigneMm;

    // Marges et zone de contenu
    const margesGauche = MARGE_HORIZONTALE;
    const margesDroite = MARGE_HORIZONTALE;
    const largeurContenu = doc.page.width - margesGauche - margesDroite;

    // Generer les cibles concentriques aux 4 coins
    try {
        genererCiblesConcentriques(doc, 7, 5);
    } catch (error) {
        throw ErreurAprilTag.assigner(error);
    }

    const sess = new Session({ 'annee': 2024, 'id_session': 1, 'nom': 'Session Test', 'statut': 1 });
    sessionCache.set(1234, sess);
    const epr = new Epreuve({ id_session: 1234, code_epreuve: 'HAI123X', nom: 'Sciences de l\'émargement', date_epreuve: new Date('2024-06-15T09:00:00').getTime() / 60000, duree: 120, nb_presents: 30, statut: 1 });
    sess.epreuves.set(epr.codeEpreuve, epr);

    // Dessiner l'en-tête (titres, infos épreuve, lettres A-Z)
    renduEnteteEmargement(doc, epr, noms, 'TD.36.106', { gauche: margesGauche, droite: margesDroite }, `p. ${numPage}/${pagesTotal}`);

    // Numéro de page (centré bas)
    /*doc.fontSize(10);
    doc.font('Helvetica');
    const pageTexte = `Page ${numPage}`;
    const pageLargeur = doc.widthOfString(pageTexte, { lineBreak: false });
    doc.text(pageTexte, (doc.page.width - pageLargeur) / 2, doc.page.height - 28, { baseline: 'middle', lineBreak: false });*/

    // Entête du tableau
    renduEnteteTableauEmargement(doc, margesGauche, mmToPoints(positionYDepartMm - hauteurLigneMm), largeurContenu, mmToPoints(hauteurLigneMm));

    // Lignes horizontales et noms
    doc.fontSize(12);
    for (let i = 0; i < noms.length; i++) {

        // Rendu de chaque ligne
        const yDebut = mmToPoints(positionYDepartMm + i * hauteurLigneMm);
        const numeroEtu = '22300' + Math.round((Math.random() * 999)).toString().padStart(3, '0');
        renduLigneEmargement(doc, i, margesGauche, yDebut, largeurContenu, mmToPoints(hauteurLigneMm), noms[i]![1], noms[i]![0], numeroEtu);

    }

    // Ligne finale (fermeture tableau)
    const finTableauY = mmToPoints(positionYDepartMm + noms.length * hauteurLigneMm);
    doc.moveTo(margesGauche, finTableauY)
        .lineTo(doc.page.width - margesDroite, finTableauY)
        .strokeColor('#000000')
        .lineWidth(0.5)
        .stroke();

    // Contours du tableau,
    // on ajoute 1 ligne pour l'entête
    renduTableauEmargement(doc, margesGauche, mmToPoints(positionYDepartMm - hauteurLigneMm), mmToPoints(hauteurLigneMm), noms.length + 1, largeurContenu);

    // Pied de page
    renduPiedPageEmargement(doc, margesGauche, finTableauY, largeurContenu);

    return doc;
}