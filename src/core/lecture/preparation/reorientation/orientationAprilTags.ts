import { AprilTagDetection } from "@monumental-works/apriltag-node";
import { ScanData } from "../extraireScans";
import { APRILTAGS_IDS } from "../../../generation/common/genererAprilTags";
import { ErreurAlignement } from "../../lectureErreurs";

type TagDistance = { id: number, distance: number };

const ARRANGEMENTS_ORIENTATION = [
    [0, 1, 2, 3], // 0°
    [1, 3, 0, 2], // 90°
    [3, 2, 1, 0], // 180°
    [2, 0, 3, 1]  // 270°
].map(arr => arr.map((indexVal) => APRILTAGS_IDS[indexVal]));

/**
 * Renvoit une l'orientation des april tags sur le document.
 * @param scan 
 * @param detections 
 * @returns L'angle de rotation en degrés à appliquer, et l'ordre des tags détectés (valeur null = tag illisible ou incohérent).
 */
export function orientationAprilTags(scan: ScanData, detections: AprilTagDetection[]): { orientation: number, ordreTags: (number | null)[] } {

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

    // Vérifier les doublons (tag détecté pour deux coins => un tag est manquant ou illisible)
    for (let i = 0; i < tagParCoin.length; i++) {
        const tag = tagParCoin[i];
        if (!tag) continue;

        // Chercher un doublon?
        for (let j = i + 1; j < tagParCoin.length; j++) {
            const tagCompare = tagParCoin[j];
            if (tagCompare && tag.id === tagCompare.id) {
                // Doublon trouvé, on ne garde que la distance la plus courte
                if (tag.distance <= tagCompare.distance) {
                    tagParCoin[j] = null;
                } else {
                    tagParCoin[i] = null;
                }
            }
        }
    }

    // Vérifier l'arrangement obtenu
    // Un coin null signifie que le tag est illisible ou incorrect, il n'invalide pas l'arrangement
    let orientationTrouvee = null;
    for (let orientation = 0; orientation < ARRANGEMENTS_ORIENTATION.length; orientation++) {
        const arrangementAttendu = ARRANGEMENTS_ORIENTATION[orientation]!;

        // Vérifier la correspondance coin par coin
        for (let i = 0; i < tagParCoin.length; i++) {
            const tagCoin = tagParCoin[i];
            if (tagCoin && tagCoin.id === arrangementAttendu[i]) {
                if (orientationTrouvee === orientation) {
                    // 2 tags en place, orientation confirmée
                    break;
                }
                orientationTrouvee = orientation;
            }
        }
    }

    if (orientationTrouvee === null) {
        throw new ErreurAlignement("Impossible de déterminer l'orientation du document : arrangement des april tags incohérent.");
    }

    // Construire l'ordre des tags, égal à ARRANGEMENTS_ORIENTATION[0], mais en maintenant les valeurs nulles
    // On prend l'orientation à 0° car on assume que le document est réorienté correctement
    let ordreTags = ARRANGEMENTS_ORIENTATION[0]!.map((id) =>
        tagParCoin.find(t => t?.id === id) ? id! : null // id si coin existe, sinon null
    );

    return { orientation: orientationTrouvee * 90, ordreTags };
}