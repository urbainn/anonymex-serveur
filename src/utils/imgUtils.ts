import { Mat } from "@techstark/opencv-js";
import { OpenCvInstance } from "../core/services/OpenCvInstance";
import sharp from "sharp";

/**
 * Matrice opencv -> instance sharp
 * @param cv Instance opencv prête
 * @param mat Matrice opencv en BGR
 * @returns 
 */
export function matToSharp(cv: any, mat: Mat): sharp.Sharp {
    const rgb = new cv.Mat();
    cv.cvtColor(mat, rgb, cv.COLOR_BGR2RGB);

    const buffer = Buffer.from(rgb.data);
    const channels = rgb.channels() as 1 | 2 | 3 | 4;
    const result = sharp(buffer, {
        raw: {
            width: rgb.cols,
            height: rgb.rows,
            channels
        }
    });

    rgb.delete();
    return result;
}
