export abstract class ErreurBase extends Error {
    /**
     * Erreur générique Anonymex
     * @param message Message descriptif
     * @param cause Erreur à l'origine (optionnel)
     */
    constructor(message: string, cause?: Error) {
        super(message);
        this.name = new.target.name; // Nom de la sous-classe instanciée
        this.cause = cause;

        // Récupère la stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, new.target);
        }
    }

    /**
     * Normalise l'erreur passée en une instance d'ErreurBase si ce n'en est pas déjà une.
     * @param error Erreur à transformer.
     * @returns ErreurBase dans le nouveau domaine.
     * @example
     * try { faireQqchoseDomaine(); } catch (error) {
     *   throw ErreurDomaine.assigner(error);
     * }
     */
    static assigner(error: unknown): ErreurBase {
        if (error instanceof ErreurBase) {
            return error;
        }

        // Créer un constructeur de l'erreur courante (sous-classe d'ErreurBase)
        const errConstr = this as unknown as { new(message: string, cause?: Error): ErreurBase }; // 'this' de type inconnu puisque méthode statique
        if (error instanceof Error) {
            // Erreur standard passée => on la wrappe
            return new errConstr(error.message, error);
        } else {
            // Sinon, on convertit en string
            return new errConstr(String(error));
        }
    }
}