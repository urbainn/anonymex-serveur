import { Fichier } from "../../routes/useFile";
import { CallbackLecture, lireBordereaux } from "./lireBordereaux";

export interface Depot {
    codeEpreuve: string;
    fichiers: Fichier[];
    /**
     * Callback pour remonter la progression de la lecture. Undefined si aucun client connecté. \
     * Connexion établie via *Server-Sent Events* (SSE) sur l'endpoint `/api/lecture/progress/:depotId`.
     */
    callback?: CallbackLecture;
    /**
     * Appellé lorsque la lecture du dépôt est terminée, pour nettoyer les ressources associées. \
     * Permet notamment de fermer la connexion SSE si un client est connecté.
     */
    onComplete?: () => void;
}

/**
 * Gère et coordonne les dépôts (documents à lire).
 */
export class DepotsManager {
    /** La file d'attente des dépôts. */
    private static depotQueue: Depot[] = [];

    /** Map des dépôts lus ou en attente, clé = ID de dépôt. */
    private static depots = new Map<number, Depot>();

    /** ID du prochain dépôt à créer. */
    private static nextDepotId = 1;

    /**
     * Créer un dépôt et l'ajouter.
     * @param codeEpreuve Code de l'épreuve associée au dépôt.
     * @param fichiers Fichiers du dépôt.
     * @returns ID du dépôt créé.
     */
    public static creerDepot(codeEpreuve: string, fichiers: Fichier[]): number {
        const id = this.nextDepotId++;
        const depot = { codeEpreuve, fichiers };
        this.depots.set(id, depot);
        this.ajoutDepot(depot);
        return id;
    }

    /**
     * Commence la lecture d'un dépôt, ou l'ajoute en file d'attente si une lecture est déjà en cours.
     * @param depot 
     * @returns 
     */
    public static ajoutDepot(depot: Depot): void {
        if (this.depotQueue.length === 0) {
            this.lectureDepot(depot);
        } else {
            this.depotQueue.push(depot);
        }
    }

    /**
     * Lit un dépôt, et une fois terminé, passe au dépôt suivant dans la file d'attente.
     * @param depot 
     */
    private static async lectureDepot(depot: Depot): Promise<void> {
        try {
            await lireBordereaux(depot.fichiers, () => depot);
        } catch (error) {
            depot.callback?.('error', -1, error instanceof Error ? { message: error.message } : { message: 'Inconnu' });
        } finally {
            // Défiler le dépôt suivant
            if (this.depotQueue.length > 0) {
                const nextDepot = this.depotQueue.shift();
                if (nextDepot) this.lectureDepot(nextDepot);
            }
        }
    }

    /** Récupère un dépôt par son ID. */
    public static getDepot(id: number): Depot | undefined {
        return this.depots.get(id);
    }
}