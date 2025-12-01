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
        .resize({
            width: 128, height: 128, fit: "contain", background: { r: 255, g: 255, b: 255 },
            kernel: "lanczos3"
        })
        .median(1)
        .threshold(190)
        .flatten({ background: "#ffffff" })

};