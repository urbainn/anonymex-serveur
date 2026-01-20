import { LayoutPosition, ModeleLectureBase } from '../../ModeleLectureBase';

export abstract class CadreEtudiantModule extends ModeleLectureBase {

    abstract getZonesLecture(): {
        /** Positions de chaque cadre d'entrée du code anonymat */
        lettresCodeAnonymat: LayoutPosition[];
        /** Positions de chaque cadre d'entrée du code d'épreuve */
        lettresCodeEpreuve: LayoutPosition[];
    };

}

export abstract class CadreCorrecteurModule extends ModeleLectureBase {

    abstract getZonesLecture(): {
        /** Liste des cases de notation. Par ordre CROISSANT (index = note). \
         * Une marge interne sera appliquée lors de la lecture, il faut donc inclure l'ensemble de la case, dont bordure, mais sans marge externe. */
        casesNote: LayoutPosition[];
        /** Liste des cases de quart de point. [0.25, 0.5, 0.75] */
        casesQuartPoint: LayoutPosition[];
        /** Case 'erreur' */
        caseErreur: LayoutPosition;
    };

}

export abstract class EnteteModule extends ModeleLectureBase {
    abstract getZonesLecture(): {};
}