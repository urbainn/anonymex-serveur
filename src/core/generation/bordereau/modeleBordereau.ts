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

        const y = 280;
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
        const gap = mmToPoints(3);

        const largeurGrille = 195;
        const largeurElement = largeurGrille / 5 - gap; // 5 colonnes
        const caseLargeur = mmToPoints(4.5);
        const caseHauteur = mmToPoints(3.5);

        const y = 495;

        // Dessiner la grille de notation
        const notes: LayoutPosition[] = [];
        const fractions: LayoutPosition[] = [];
        for (let i = 0; i <= 24; i++) {
            const ligne = Math.floor(i / 5);
            const colonne = i % 5;

            const coche = {
                x: 114 + colonne * (largeurElement + gap),
                y: y + ligne * (33 + gap),
                largeur: caseLargeur,
                hauteur: caseHauteur,
            };

            if (i <= 20) {
                // Notes
                notes.push(coche);
            } else if (i > 21) {
                fractions.push(coche);
            }
        }

        // Case Erreur
        const caseErreur: LayoutPosition = {
            x: 335,
            y: 575,
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
            lettresCodeAnonymat: ModeleBordereau.getPositionsCadresAnonymat()
        };
    }

}