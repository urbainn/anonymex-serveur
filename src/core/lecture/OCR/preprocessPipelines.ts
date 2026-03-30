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
        .grayscale()
        .normalise()
        .gamma(1.35)
        .median(1)
        .threshold(170)
        .flatten({ background: "#ffffff" })
        .trim({ threshold: 8, background: "#ffffff" })
        .extend({
            top: 4,
            bottom: 4,
            left: 4,
            right: 4,
            background: "#ffffff"
        })
        .resize(28, 28, {
            fit: "contain",
            background: { r: 255, g: 255, b: 255 },
            kernel: "lanczos3"
        }),

};