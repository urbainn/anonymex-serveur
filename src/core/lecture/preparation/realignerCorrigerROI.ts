import { Mat } from "@techstark/opencv-js";
import { OpenCvInstance } from "../../services/OpenCvInstance";

export async function extraireROI(roiMat: Mat): Promise<any> {
    const cv = await OpenCvInstance.getInstance();

    // greyscale + flou et seuillage pour binariser l'image
    const gris = new cv.Mat();
    cv.cvtColor(roiMat, gris, cv.COLOR_BGR2GRAY);
    const ktaille = new cv.Size(5, 5);
    cv.GaussianBlur(gris, gris, ktaille, 0);

    // algorithme de Canny pour détecter les contours
    // https://docs.opencv.org/4.x/da/d22/tutorial_py_canny.html
    const canny = new cv.Mat();
    cv.Canny(gris, canny, 50, 150);
    gris.delete();



}