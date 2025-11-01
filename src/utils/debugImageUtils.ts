import { promises as fs } from "node:fs";
import { createCanvas } from "canvas";
import sharp from "sharp";
import type { AprilTagDetection } from "@monumental-works/apriltag-node";

type RawImage = {
    data: Uint8Array | Uint8ClampedArray;
    width: number;
    height: number;
    channels?: number;
};

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

export async function debugAprilDetections(image: RawImage, detections: AprilTagDetection[], outputPath = "detection.png"): Promise<void> {
}
