import type PDFDocument from 'pdfkit';

/** Element du layout (zone de lecture) */
export type LayoutPosition = {
    x: number;
    y: number;
    largeur: number;
    hauteur: number;
}

abstract class ModuleBase {

    abstract getNom(): string;
    abstract getFormat(): 'A4' | 'A5';

    /**
     * Générer le module.
     */
    abstract generer(pdf: typeof PDFDocument): boolean;

    /**
     * Positions des éléments de lecture dans le layout.
     * @return Dictionnaire des positions, par identifiant/nom
     */
    abstract getLayoutPositions(): Record<string, LayoutPosition | LayoutPosition[]>;

}

export abstract class CadreEtudiantModule extends ModuleBase {

    abstract getLayoutPositions(): {
        /** Positions de chaque cadre d'entrée du code anonymat */
        lettresCodeAnonymat: LayoutPosition[];
        /** Positions de chaque cadre d'entrée du code d'épreuve */
        lettresCodeEpreuve: LayoutPosition[];
    };

}

export abstract class CadreCorrecteurModule extends ModuleBase {

    abstract getLayoutPositions(): {
        /** Liste des cases de notation. Par ordre CROISSANT (index = note). \
         * Une marge interne sera appliquée lors de la lecture, il faut donc inclure l'ensemble de la case, dont bordure, mais sans marge externe. */
        casesNote: LayoutPosition[];
        /** Liste des cases de quart de point. [0.25, 0.5, 0.75] */
        casesQuartPoint: LayoutPosition[];
        /** Case 'erreur' */
        caseErreur: LayoutPosition;
    };

}

export abstract class EnteteModule extends ModuleBase {
    abstract getLayoutPositions(): {};
}