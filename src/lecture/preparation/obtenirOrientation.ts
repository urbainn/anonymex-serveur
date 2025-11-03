import { AprilTagDetection } from "@monumental-works/apriltag-node";
import { ScanData } from "./extraireScans";
import { APRILTAGS_IDS } from "../../generation/bordereau/genererAprilTags";
import { ErreurAlignement } from "../lectureErreurs";

type TagDistance = { id: number, distance: number };

const ARRANGEMENTS_ORIENTATION = [
    [0, 1, 2, 3], // 0°
    [1, 3, 0, 2], // 90°
    [3, 2, 1, 0], // 180°
    [2, 0, 3, 1]  // 270°
].map(arr => arr.map((indexVal) => APRILTAGS_IDS[indexVal]));

/**
 * Renvoit une valeur de correction d'orientation basée sur les détections d'april tags (0, 90, 180, 270).
 * @param scan 
 * @param detections 
 * @returns Angle de rotation à appliquer pour obtenir la bonne orientation (n * 90 degrés)
 */
export function obtenirOrientation(scan: ScanData, detections: AprilTagDetection[]): number {

    // L'idée de cet algorithme est de, pour chaque coin du document, trouver le tag le plus proche
    // ainsi que sa distance. Puis on réoriente le document en fonction de l'ordre des tags trouvé, si cohérent.

    // calculer les coords de chaque coin du document dans l'ordre attendu (HG, HD, BG, BD)
    const coins = [
        { x: 0, y: 0 }, // HG
        { x: scan.width, y: 0 }, // HD
        { x: 0, y: scan.height }, // BG
        { x: scan.width, y: scan.height }  // BD
    ]

    const tagParCoin: (TagDistance | null)[] = [];

    for (let i = 0; i < coins.length; i++) {
        const coin = coins[i]!;

        for (const detection of detections) {

            // Calculer la distance entre le coin et le centre du tag
            const dx = Math.abs(detection.center[0] - coin.x);
            const dy = Math.abs(detection.center[1] - coin.y);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (!tagParCoin[i] || distance < tagParCoin[i]!.distance) {
                tagParCoin[i] = { id: detection.id, distance };
            }
        }
    }

    console.log("Tags les plus proches par coin :", tagParCoin);

    // TODO: supprimer les tags dupliqués

    // Vérifier l'arrangement obtenu
    // Un coin null signifie que le tag est illisible ou incorrect, il n'invalide pas l'arrangement
    let orientationTrouvee = null;
    for (let orientation = 0; orientation < ARRANGEMENTS_ORIENTATION.length; orientation++) {
        const arrangementAttendu = ARRANGEMENTS_ORIENTATION[orientation]!;

        // Vérifier la correspondance coin par coin
        for (let i = 0; i < tagParCoin.length; i++) {
            const tagCoin = tagParCoin[i];
            if (tagCoin && tagCoin.id === arrangementAttendu[i]) {
                orientationTrouvee = orientation;
            }
        }
    }

    console.log("Orientation trouvée :", orientationTrouvee !== null ? orientationTrouvee * 90 : "Aucune");

    if (orientationTrouvee === null) {
        throw new ErreurAlignement("Impossible de déterminer l'orientation du document : arrangement des april tags incohérent.");
    }

    return orientationTrouvee;
}