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

/**
 * Ecrit sur le disque l'image d'un buffer 1 canal (gris) ou 3 canaux (RGB).
 * Utile pour le debug.
 * @param buffer Buffer de l'image (Uint8Array)
 * @param width
 * @param height
 * @param channels nb. canaux
 * @param path Chemin du fichier de sortie
 */
export async function debugImageDisque(buffer: Uint8Array | Uint8ClampedArray, width: number, height: number, channels: 1 | 3, path: string): Promise<void> {
    sharp(buffer, {
        raw: {
            width: width,
            height: height,
            channels: channels
        }
    })
        .png()
        .toFile(path);
}
