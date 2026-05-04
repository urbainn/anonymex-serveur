import { createCanvas, createImageData, Canvas } from "canvas";
import sharp from "sharp";

/**
 * Imprime une image sharp sur un nouveau canvas de taille équivalente.
 */
export async function sharp2canvas(image: sharp.Sharp): Promise<Canvas> {
    const imgRaw = await image
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const canvas = createCanvas(imgRaw.info.width, imgRaw.info.height);
    const ctx = canvas.getContext("2d");

    // Dessiner l'image de base
    const imgData = createImageData(new Uint8ClampedArray(imgRaw.data), imgRaw.info.width, imgRaw.info.height);
    ctx.putImageData(imgData, 0, 0);

    return canvas;
}