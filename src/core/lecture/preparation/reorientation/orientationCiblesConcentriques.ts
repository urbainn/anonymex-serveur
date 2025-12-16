import { CIBLES_NB_RINGS } from "../../../generation/bordereau/genererCiblesConcentriques";
import { CibleConcentriqueDetection } from "../detecterCiblesConcentriques";

/** Classer les IDs de cible par niveau de confiance; cibles qui sont les moins sujettes aux erreurs de détection en premier */
const ORDRE_CONFIANCE_CIBLES = [4, 3, 1, 0];

/** Transformation associée à chaque arrangement d'IDs de cibles concentriques pour déterminer l'orientation */
const ARRANGEMENTS_ORIENTATION = [
    [0, 1, 2, 3], // 0°
    [1, 3, 0, 2], // 90°
    [3, 2, 1, 0], // 180°
    [2, 0, 3, 1]  // 270° (i * 90°)
].map(arr => arr.map((indexVal) => CIBLES_NB_RINGS[indexVal]));


/**
 * Renvoyer l'orientation du document à partir des détections des cibles concentriques.
 * @param detectionsCibles Liste des détections de cibles concentriques, dans l'ordre des coins standard (HG, HD, BG, BD).
 * @returns L'angle de rotation à appliquer (en degrés). -1 si confiance insuffisante ou cibles illisibles.
 */
export function orientationCiblesConcentriques(detectionsCibles: Array<null | CibleConcentriqueDetection>): number {

    // Supprimer les cibles doublons (2 fois le même coin = problème de lecture)
    const detectionsUniques: CibleConcentriqueDetection[] = [];
    const coinsVus = new Set<number>();
    for (const detection of detectionsCibles) {
        if (detection === null) continue;
        if (!coinsVus.has(detection.coin)) {
            detectionsUniques.push(detection);
            coinsVus.add(detection.coin);
        }
    }

    // l'orientation doit être validée par au moins deux cibles consécutives
    // on stocke l'orientation précédente, afin de la comparer et valider la cohérence
    let orientationPrecedente = -1;

    // de la cible la plus fiable à la moins fiable..
    for (const coinIndex of ORDRE_CONFIANCE_CIBLES) {
        const detection = detectionsUniques.find(det => det.coin === coinIndex);
        if (!detection) continue;

        // Chercher un arrangement correspondant
        for (let i = 0; i < ARRANGEMENTS_ORIENTATION.length; i++) {
            const arrangement = ARRANGEMENTS_ORIENTATION[i]!;
            if (arrangement[coinIndex] === detection.rings) {
                if (orientationPrecedente === i * 90) {
                    // angle validé par au moins deux cibles consécutives
                    return i * 90;
                } else {
                    // première validation, stocker l'orientation
                    orientationPrecedente = i * 90;
                }
            }
        }
    }

    return -1; // Valeur par défaut si aucune cible fiable n'est trouvée
}