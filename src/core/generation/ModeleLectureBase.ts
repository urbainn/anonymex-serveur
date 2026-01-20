import type PDFDocument from 'pdfkit';

/** Element du layout (zone de lecture) */
export type LayoutPosition = {
    x: number;
    y: number;
    largeur: number;
    hauteur: number;
}

/**
 * Modèle d'un document de lecture, contenant des zones de lecture.
 */
export abstract class ModeleLectureBase {

    abstract getNom(): string;
    abstract getFormat(): 'A4' | 'A5';

    /**
     * Générer (rendu vectoriel) le modèle de lecture.
     */
    abstract generer(pdf: typeof PDFDocument): boolean;

    /**
     * Positions des éléments de lecture dans le layout.
     * @return Dictionnaire des positions, par identifiant/nom
     */
    abstract getZonesLecture(): Record<string, LayoutPosition | LayoutPosition[]>;

}