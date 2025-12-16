import { ErreurAlignement } from "../../lectureErreurs";
import { CibleConcentriqueDetection } from "../detecterCiblesConcentriques";

const TABLEAU_MUTATION_COIN = [
    // nouvelle position des coins après rotation de l'image
    [1, 3, 0, 2], // rotation 90°
    [3, 2, 1, 0], // rotation 180°
    [2, 0, 3, 1]  // rotation 270°
] as const;

/**
 * Remappe l'ordre des cibles concentriques détectées en fonction des transformations appliquées à l'image (suite à la réorientation).
 * @param detections Détections de cibles concentriques avant remapping.
 * @param orientation Angle de rotation appliqué à l'image (multiple de 90°).
 * @param width largeur image
 * @param height hauteur image
 * @returns Nouvelles détections avec ordre remappé.
 */
export function remapperCiblesConcentriques(detections: Array<null | CibleConcentriqueDetection>, orientation: number, width: number, height: number): Array<null | CibleConcentriqueDetection> {
    if (orientation % 90 !== 0) {
        throw new ErreurAlignement("L'orientation doit être un multiple de 90° pour le remapping des détections.");
    }

    const angle = ((orientation % 360) + 360) % 360; // Normaliser entre 0 et 270°
    if (angle === 0) {
        return detections; // Pas de remapping nécessaire
    }

    const remappedDetections: Array<null | CibleConcentriqueDetection> = [null, null, null, null];

    for (const detection of detections) {
        if (detection === null) continue;

        let newCoin: number;
        let newCentre: [number, number];
        switch (angle) {
            case 90:
                newCoin = TABLEAU_MUTATION_COIN[0][detection.coin];
                newCentre = [height - detection.centre[1], detection.centre[0]];
                break;
            case 180:
                newCoin = TABLEAU_MUTATION_COIN[1][detection.coin];
                newCentre = [width - detection.centre[0], height - detection.centre[1]];
                break;
            case 270:
                newCoin = TABLEAU_MUTATION_COIN[2][detection.coin];
                newCentre = [detection.centre[1], width - detection.centre[0]];
                break;
            default:
                throw new ErreurAlignement("Angle de rotation non supporté pour le remapping des détections.");
        }

        console.log('remapped coin ', detection.coin, '->', newCoin, ' (rings: ', detection.rings, ')');
        remappedDetections[newCoin] = { ...detection, coin: newCoin as 0 | 1 | 2 | 3, centre: newCentre };
    }

    return remappedDetections;
}