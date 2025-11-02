import { promises as fs } from "node:fs";
import { createCanvas, createImageData, Canvas } from "canvas";
import sharp from "sharp";
import type { AprilTagDetection } from "@monumental-works/apriltag-node";
import { ScanData } from "../lecture/preparation/extraireScans";

type RawImage = {
    data: Uint8Array | Uint8ClampedArray;
    width: number;
    height: number;
    channels?: number;
};

/**
 * Convertit un ScanData en Canvas pour pouvoir dessiner dessus.
 * @param image Le scan à convertir
 * @returns Un canvas avec l'image dessinée
 */
async function scan2canvas(image: ScanData): Promise<Canvas> {
    // Convertir l'image en RGBA avec sharp
    const rgbaImage = await sharp(Buffer.from(image.data), {
        raw: {
            width: image.width,
            height: image.height,
            channels: image.channels
        }
    })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const canvas = createCanvas(rgbaImage.info.width, rgbaImage.info.height);
    const ctx = canvas.getContext("2d");

    // Dessiner l'image de base
    const imgData = createImageData(new Uint8ClampedArray(rgbaImage.data), rgbaImage.info.width, rgbaImage.info.height);
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

export async function debugAprilDetections(image: ScanData, detections: AprilTagDetection[], outputPath = "debug/detection.png"): Promise<void> {
    const canvas = await scan2canvas(image);
    const ctx = canvas.getContext("2d");

    for (const detection of detections) {
        // contour du tag
        const corners = detection.corners;
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 5;
        ctx.beginPath();
        for (let i = 0; i < corners.length; i++) {
            const corner = corners[i]!;
            if (i === 0) {
                ctx.moveTo(corner[0], corner[1]);
            } else {
                ctx.lineTo(corner[0], corner[1]);
            }
        }
        ctx.closePath();
        ctx.stroke();

        const centreX = detection.center[0];
        const centreY = detection.center[1];

        // contours/géométrie du document 
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(centreX, centreY);
        for (const autreDetection of detections) {
            if (autreDetection !== detection) {
                const autreCentreX = autreDetection.center[0];
                const autreCentreY = autreDetection.center[1];
                ctx.lineTo(autreCentreX, autreCentreY);
            }
        }
        ctx.closePath();
        ctx.stroke();

        // Dessiner l'id au centre du tag
        ctx.fillStyle = 'red';
        ctx.font = '900 30px Arial';
        ctx.fillText(detection.id.toString(), centreX - 20, centreY + 10);

    }

    const buffer = canvas.toBuffer("image/png");
    await fs.writeFile(outputPath, buffer);
}
