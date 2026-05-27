import { Mat } from "@techstark/opencv-js";
import { CvType } from "../core/services/OpenCvInstance";
import sharp from "sharp";

function matToRawForSharp(cv: CvType, mat: Mat): { rawMat: Mat; channels: 1 | 2 | 3 | 4 } {
    const channels = mat.channels();
    const rawMat = new cv.Mat();

    if (channels === 1) {
        mat.copyTo(rawMat);
        return { rawMat, channels: 1 };
    }

    if (channels === 3) {
        cv.cvtColor(mat, rawMat, cv.COLOR_BGR2RGB);
        return { rawMat, channels: 3 };
    }

    if (channels === 4) {
        cv.cvtColor(mat, rawMat, cv.COLOR_BGRA2RGBA);
        return { rawMat, channels: 4 };
    }

    rawMat.delete();
    throw new Error(`Nombre de canaux non supporte pour la conversion image: ${channels}`);
}

/**
 * Matrice opencv -> instance sharp
 * @param cv Instance opencv prête
 * @param mat Matrice opencv en BGR
 * @returns 
 */
export function matToSharp(cv: CvType, mat: Mat): sharp.Sharp {
    const { rawMat, channels } = matToRawForSharp(cv, mat);
    const buffer = Buffer.from(rawMat.data);
    const result = sharp(buffer, {
        raw: {
            width: rawMat.cols,
            height: rawMat.rows,
            channels
        }
    });

    rawMat.delete();
    return result;
}

export async function matToBuffer(cv: CvType, mat: Mat): Promise<Buffer> {
    return matToSharp(cv, mat)
        .png()
        .toBuffer();
}
