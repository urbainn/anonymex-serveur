import { ErreurAlignement } from "../../lectureErreurs";
import { CibleConcentriqueDetection } from "../detecterCiblesConcentriques";

/**
 * Remappe l'ordre des cibles concentriques détectées en fonction des transformations appliquées à l'image (suite à la réorientation).
 * @param detections Détections de cibles concentriques avant remapping.
 * @param orientation Angle de rotation appliqué à l'image (multiple de 90°).
 * @returns Nouvelles détections avec ordre remappé.
 */
export function remapperCiblesConcentriques(detections: Array<null | CibleConcentriqueDetection>, orientation: number): Array<null | CibleConcentriqueDetection> {
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
        switch (angle) {
            case 90:
                newCoin = (detection.coin + 1) % 4;
                break;
            case 180:
                newCoin = (detection.coin + 2) % 4;
                break;
            case 270:
                newCoin = (detection.coin + 3) % 4;
                break;
            default:
                throw new ErreurAlignement("Angle de rotation non supporté pour le remapping des détections.");
        }

        remappedDetections[newCoin] = { ...detection, coin: newCoin as 0 | 1 | 2 | 3 };
    }

    return remappedDetections;
}