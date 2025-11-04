export enum EtapeLecture {
    EXTRACTION_SCAN,
    DETECTION_APRIL_TAGS,
    CALCULER_GEOMETRIE_ANCRAGE
}

export const etapesDeLecture: { [key in EtapeLecture]: [number, string, string] } = {
    // Clé: [Numéro d'étape, Nom de l'étape, Nom du fichier enregistré]
    [EtapeLecture.EXTRACTION_SCAN]: [0, 'Extraction des scans', 'extraction_scan'],
    [EtapeLecture.DETECTION_APRIL_TAGS]: [1, 'Détection des April Tags', 'detection_april_tags'],
    [EtapeLecture.CALCULER_GEOMETRIE_ANCRAGE]: [3, 'Calculer la géométrie du document', 'calculer_geometrie_ancrage']
};