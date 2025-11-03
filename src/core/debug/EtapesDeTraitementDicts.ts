export enum EtapeLecture {
    EXTRACTION_SCAN,
    DETECTION_APRIL_TAGS,
    ALIGNEMENT_ET_CORRECTION_DISTORSION
}

export const etapesDeLecture: { [key in EtapeLecture]: [number, string, string] } = {
    // Clé: [Numéro d'étape, Nom de l'étape, Nom du fichier enregistré]
    [EtapeLecture.EXTRACTION_SCAN]: [0, 'Extraction des scans', 'extraction_scan'],
    [EtapeLecture.DETECTION_APRIL_TAGS]: [1, 'Détection des April Tags', 'detection_april_tags'],
    [EtapeLecture.ALIGNEMENT_ET_CORRECTION_DISTORSION]: [2, 'Alignement et correction de la distorsion', 'alignement_correction_distorsion']
};