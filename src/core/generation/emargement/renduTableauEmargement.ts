import PDFDocument from 'pdfkit';
import { Etudiant } from '../../../cache/etudiants/Etudiant';
import { mmToPoints, tronquerTexte } from '../../../utils/pdfUtils';
import { genererAprilTag } from '../common/genererAprilTags';

type ColonneTableau = { titre: string, largeurPourcent: number };

const COLONNES_TABLEAU = [
    { titre: '', largeurPourcent: 4 },
    { titre: '', largeurPourcent: 4 },
    { titre: 'Nom', largeurPourcent: 32 },
    { titre: 'Prénom', largeurPourcent: 23 },
    { titre: 'N° Étudiant', largeurPourcent: 14 },
    { titre: 'Signature', largeurPourcent: 23 }
] as [ColonneTableau, ColonneTableau, ColonneTableau, ColonneTableau, ColonneTableau, ColonneTableau];

const MARGE_INTERNE_CELLULES_PT = mmToPoints(2); // marge interne des cellules du tableau, en points
const TAILLE_TAG_MM = 4.5;

/** Rendu des contours du tableau d'émargement (colonnes uniquement) */
export function renduTableauEmargement(doc: typeof PDFDocument, x: number, y: number, tailleLigne: number, nbLignes: number, largeur: number) {

    let xCourant = x; // position x courante pour les colonnes (= somme des largeurs précédentes + x de départ)
    for (let i = 0; i <= COLONNES_TABLEAU.length; i++) {
        const col = COLONNES_TABLEAU[i];
        const colLargeur = col ? (col.largeurPourcent / 100) * largeur : 0; // 0 pour la dernière ligne verticale, égale à la largeur totale + 0%

        const xPos = xCourant;
        const yFin = y + nbLignes * tailleLigne;

        doc.moveTo(xPos, y)
            .lineTo(xPos, yFin)
            .strokeColor('#000000')
            .lineWidth(0.5)
            .stroke();

        xCourant += colLargeur;
    }

}

export function renduLigneEmargement(doc: typeof PDFDocument, i: number, x: number, y: number, largeur: number, hauteur: number,
    nom: string, prenom: string, numEtudiant: string
) {
    // Fill une ligne sur deux
    if (i % 2 === 1) {
        doc.rect(x, y, largeur, hauteur).fill('#F0F0F0').fillColor('#000000');
    }

    // Rendu LIGNE horizontale (dessous)
    doc.moveTo(x, y)
        .lineTo(x + largeur, y)
        .strokeColor('#000000').lineWidth(0.5).stroke();

    let xCourant = x;

    // Dessiner la colonne de TAG
    {
        const tailleTagPt = mmToPoints(TAILLE_TAG_MM);
        const tailleColonneTag = (COLONNES_TABLEAU[0].largeurPourcent / 100) * largeur;
        genererAprilTag(doc, Math.round(Math.random() * 2000), TAILLE_TAG_MM, xCourant + (tailleColonneTag - tailleTagPt) / 2, y + (hauteur - tailleTagPt) / 2, 1);
        xCourant += (COLONNES_TABLEAU[0].largeurPourcent / 100) * largeur;
    }

    // Dessiner la colonne de pointage (carré de 3mm x 3mm centré)
    {
        const tailleCarrePt = mmToPoints(3);
        const xCentreColonne = xCourant + (COLONNES_TABLEAU[1].largeurPourcent / 100) * largeur / 2;
        const yCentreLigne = y + hauteur / 2;
        const xCarre = xCentreColonne - tailleCarrePt / 2;
        const yCarre = yCentreLigne - tailleCarrePt / 2;

        doc.rect(xCarre, yCarre, tailleCarrePt, tailleCarrePt).fill('#FFFFFF').fillColor('#000000');
        doc.rect(xCarre, yCarre, tailleCarrePt, tailleCarrePt).strokeColor('#000000').lineWidth(0.5).stroke();
    }

    xCourant += (COLONNES_TABLEAU[1].largeurPourcent / 100) * largeur;

    // Rendu NOM
    doc.font('Helvetica-Bold').fontSize(hauteur * 0.5);
    const tailleColonneNom = (COLONNES_TABLEAU[2].largeurPourcent / 100) * largeur;
    const yTexte = y + (hauteur - doc.currentLineHeight()) / 2 + 1.3;
    const largeurNom = tailleColonneNom - MARGE_INTERNE_CELLULES_PT;
    doc.text(tronquerTexte(doc, nom.toUpperCase(), largeurNom), xCourant + MARGE_INTERNE_CELLULES_PT, yTexte, {
        lineBreak: false
    });
    xCourant += tailleColonneNom;

    // Rendu PRÉNOM
    doc.font('Helvetica').fontSize(hauteur * 0.5);
    const tailleColonnePrenom = (COLONNES_TABLEAU[3].largeurPourcent / 100) * largeur;
    const largeurPrenom = tailleColonnePrenom - MARGE_INTERNE_CELLULES_PT;
    doc.text(tronquerTexte(doc, prenom, largeurPrenom), xCourant + MARGE_INTERNE_CELLULES_PT, yTexte, {
        lineBreak: false
    });
    xCourant += tailleColonnePrenom;

    // Rendu N° ÉTUDIANT
    const tailleColonneNumEtu = (COLONNES_TABLEAU[4].largeurPourcent / 100) * largeur;
    doc.text(tronquerTexte(doc, numEtudiant, tailleColonneNumEtu), xCourant, yTexte, {
        width: tailleColonneNumEtu,
        align: 'center',
        lineBreak: false,
    });

}

export function renduEnteteTableauEmargement(doc: typeof PDFDocument, x: number, y: number, largeur: number, hauteur: number) {
    let xCourant = x;

    doc.font('Helvetica-Bold').fontSize(hauteur * 0.5);
    const yTexte = y + (hauteur - doc.currentLineHeight()) / 2 + 1.3;

    // Fond
    doc.rect(x, y, largeur, hauteur).fill('#d6d4d4').fillColor('#000000');

    // Ligne du haut
    doc.moveTo(x, y)
        .lineTo(x + largeur, y)
        .strokeColor('#000000').lineWidth(0.5).stroke();

    // Rendu des titres de colonnes
    for (const [i, col] of COLONNES_TABLEAU.entries()) {
        const tailleColonne = (col.largeurPourcent / 100) * largeur;
        doc.text(col.titre, xCourant + MARGE_INTERNE_CELLULES_PT, yTexte, {
            width: tailleColonne - 2 * MARGE_INTERNE_CELLULES_PT,
            align: i >= 4 ? 'center' : 'left',
            lineBreak: false,
            ellipsis: true
        });
        xCourant += tailleColonne;
    }

}