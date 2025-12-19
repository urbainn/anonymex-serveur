import { Sharp } from "sharp";

/**
 * Pipelines de prétraitement pour l'OCR (modification de l'image afin d'améliorer la reconnaissance de texte).
 */
export const preprocessPipelines = {

    /** Prétraitement initial */
    initial: (img: Sharp) => img
        .grayscale()
        .normalise()
        .gamma(1.4)
        .median(1)
        .threshold(190)
        .flatten({ background: "#ffffff" }),

    /** Seuillage léger */
    lightThreshold: (img: Sharp) => img
        .grayscale()
        .normalise()
        .gamma(1.2),

    /** CNN EMNIST */
    emnist: (img: Sharp) => img
        .gamma(3)
        .threshold(200),

};