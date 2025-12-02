type DebugInfo = {
    /** Pages à inclure dans le debug (0-indexed, inclusif) */
    intervallePages: [number, number];
    /** Tester/débugger les pipelines de prétraitement? */
    testerPipelines: boolean;
};

/**
 * Représente une lecture d'un document complet (une ou plusieurs pages).
 */
export class LectureDocument {
    /** Identifiant unique à assigner à la prochaine instance */
    private static nextId = 1;

    /** Identifiant unique de la lecture */
    protected idLecture: number = LectureDocument.nextId++;

    /** Nom du document source (fichier) */
    public nomDocument: string;

    /** Nombre de pages dans le document */
    public nbPages: number;

    /** Nombre de pages lues */
    public nbPagesLues: number = 0;

    /** Débugger le document : enregistrer les étapes de la traitement dans le répertoire de debug. Null si désactivé */
    public debug: DebugInfo | null = null;

    /**
     * @param nomDocument Nom du document source (fichier).
     * @param nbPages Nombre de pages dans le document.
     * @param debug Paramètres du mode débug (null pour désactiver).
     */
    constructor(nomDocument: string, nbPages: number, debug: DebugInfo | null = null) {
        this.nomDocument = nomDocument;
        this.nbPages = nbPages;
        this.debug = debug;
    }

}