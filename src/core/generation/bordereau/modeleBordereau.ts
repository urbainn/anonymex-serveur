import { mmToPoints } from "../../../utils/pdfUtils";
import { LayoutPosition, ModeleLectureBase } from "../ModeleLectureBase";

export class ModeleBordereau extends ModeleLectureBase {

    private static positionsCadresAnonymat: LayoutPosition[];
    private static positionsCasesNote: { notes: LayoutPosition[], fractions: LayoutPosition[], caseErreur: LayoutPosition };

    static getPositionsCadresAnonymat(): LayoutPosition[] {
        if (this.positionsCadresAnonymat) return this.positionsCadresAnonymat;

        // Calculer les positions des zones de lecture du bordereau
        const tailleDoc = mmToPoints(210); // Largeur d'une page A4 en points
        const gap = mmToPoints(4);
        const cadreLargeur = mmToPoints(14);
        const cadreHauteur = mmToPoints(16);

        const y = 268 - 20;
        const tailleTotale = 6 * cadreLargeur + 5 * gap + 15;
        const startX = (tailleDoc - tailleTotale) / 2;

        const positions: LayoutPosition[] = [];
        for (let i = 0; i < 6; i++) {
            positions.push({
                x: startX + i * (cadreLargeur + gap) + (i >= 3 ? 15 : 0), // Ajouter une marge de 10 points après les 3 premiers cadres
                y: y,
                largeur: cadreLargeur,
                hauteur: cadreHauteur,
            });
        }

        return positions;
    }

    static getPositionsCasesNote() {
        if (this.positionsCasesNote) return this.positionsCasesNote;

        // Calculer les positions des cases de notation
        //const tailleDoc = mmToPoints(210); // Largeur d'une page A4 en points
        const gap = mmToPoints(4);

        const largeurGrille = 256;
        const largeurElement = largeurGrille / 7 - gap; // 7 colonnes
        const caseLargeur = mmToPoints(4.5);
        const caseHauteur = mmToPoints(3.5);

        const y = 553;

        const notes: LayoutPosition[] = new Array(20);
        const fractions: LayoutPosition[] = [];

        // Dessiner la grille de notation
        for (let i = 0; i <= 25; i++) {
            const ligne = Math.floor(i / 7);
            const colonne = i % 7;

            const coche = {
                x: 95 + colonne * (largeurElement + gap),
                y: y + ligne * (33 + gap),
                largeur: caseLargeur,
                hauteur: caseHauteur,
            };

            if (i <= 20) {
                // Notes
                notes[20 - i] = coche;
            } else if (i > 22) {
                // Fractions
                fractions.unshift(coche);
            }
        }

        // Case Erreur
        const caseErreur: LayoutPosition = {
            x: 365,
            y: 624,
            largeur: caseLargeur,
            hauteur: caseHauteur,
        };

        return { notes, fractions, caseErreur };

    }

    getNom(): string {
        return "Bordereau d'anonymat";
    }

    getFormat(): "A4" | "A5" {
        return "A4";
    }

    getZonesLecture() {
        return {
            lettresCodeAnonymat: ModeleBordereau.getPositionsCadresAnonymat(),
            casesNote: ModeleBordereau.getPositionsCasesNote().notes,
            casesFraction: ModeleBordereau.getPositionsCasesNote().fractions,
            caseErreur: ModeleBordereau.getPositionsCasesNote().caseErreur,
        };
    }

}