import sharp from "sharp";
import type { AprilTagDetection } from "@monumental-works/apriltag-node";
import { debugImageDisque, debugAprilDetections } from "../../utils/debugImageUtils";
import { ScanData } from "./extraireScans";

type CoordinateTransform = "flip-vertical" | "rotate-cw-90";

/**
 * Détecte les april tags dans le scan fourni et retourne leurs positions (point central, angle).
 * @param scan ImageData du scan en 3 canaux (RGB).
 */
export async function detecterAprilTags(scan: ScanData): Promise<void> {

    // probleme d'import avec CJS / ESM, on utilise un import dynamique -> A REGLER (todo)
    const apriltagModule = await import("@monumental-works/apriltag-node");
    const AprilTag = apriltagModule.default;
    const { FAMILIES } = apriltagModule;

    // J'ai fait une erreur toute bête lors de l'impression des tags, ils sont flip / miroirés en Y
    // donc on doit corriger ça temporairement à la détection en faisant un flip vertical + rotation 90°
    const flip = true;
    const transforms: CoordinateTransform[] = [];

    // Transformer le scan en niveaux de gris pour la détection
    /*const imgGris = new Uint8Array(scan.width * scan.height * 3);
    for (let i = 0; i < scan.width * scan.height; i++) {
        // (R + G + B) / 3
        const gris = Math.round((scan.data[i * 3]! + scan.data[i * 3 + 1]! + scan.data[i * 3 + 2]!) / 3);
        imgGris[i * 3] = gris;
        imgGris[i * 3 + 1] = gris;
        imgGris[i * 3 + 2] = gris;
    }*/

    if (scan.channels === 1) return;

    let imageBuilder = sharp(scan.data, {
        raw: {
            width: scan.width,
            height: scan.height,
            channels: scan.channels
        }
    }).grayscale();

    if (flip) {
        transforms.push("flip-vertical", "rotate-cw-90");
        imageBuilder = imageBuilder.flip().rotate(90);
    }

    const imgGris = await imageBuilder
        .raw()
        .toBuffer({ resolveWithObject: true });

    await debugImageDisque(scan.data, scan.width, scan.height, 3, 'debug_scan_gris.png');

    const aprilTag = new AprilTag(FAMILIES.TAGSTANDARD41H12, {
        quadDecimate: 1.0, // Aucun downscaling
        quadSigma: 0.0,    // Aucun flou, image déjà nette
        refineEdges: true,
        decodeSharpening: 0.25,
        // todo: nb de threads?
    });

    // Pre-initialize to avoid delay on first detection
    await aprilTag.ensureInitialized();

    const detections = await aprilTag.detectAsync(imgGris.info.width, imgGris.info.height, imgGris.data);

    const remapPoint = createPointRemapper(transforms, imgGris.info.width, imgGris.info.height);
    const correctedDetections: AprilTagDetection[] = detections.map((detection) => ({
        ...detection,
        center: remapPoint(detection.center),
        corners: detection.corners.map((corner) => remapPoint(corner))
    }));

    console.log(JSON.stringify(correctedDetections, null, 2));

    await debugAprilDetections({
        data: scan.data,
        width: scan.width,
        height: scan.height,
        channels: Math.max(1, Math.round(scan.data.length / (scan.width * scan.height)))
    }, correctedDetections);

}

// fonction extraite d'un utilitaire SHARP temporairement stationné ici le temps de corriger l'impression des tags
function createPointRemapper(
    transforms: CoordinateTransform[],
    finalWidth: number,
    finalHeight: number
) {
    if (transforms.length === 0) {
        return (point: [number, number]): [number, number] => [point[0], point[1]];
    }

    return (point: [number, number]): [number, number] => {
        let x = point[0];
        let y = point[1];
        let currentWidth = finalWidth;
        let currentHeight = finalHeight;

        for (let i = transforms.length - 1; i >= 0; i--) {
            const transform = transforms[i];

            if (transform === "rotate-cw-90") {
                const previousWidth = currentHeight;
                const previousHeight = currentWidth;

                const newX = y;
                const newY = previousHeight - 1 - x;

                x = newX;
                y = newY;
                currentWidth = previousWidth;
                currentHeight = previousHeight;
                continue;
            }

            if (transform === "flip-vertical") {
                const previousHeight = currentHeight;

                const newX = x;
                const newY = previousHeight - 1 - y;

                x = newX;
                y = newY;
                continue;
            }
        }

        return [x, y];
    };
}
