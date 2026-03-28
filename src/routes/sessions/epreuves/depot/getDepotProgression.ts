import { Request, Response } from "express";
import { ErreurRequeteInvalide } from "../../../erreursApi";
import { DepotsManager } from "../../../../core/lecture/DepotsManager";
import { logInfo } from "../../../../utils/logger";

/**
 * Etablit une connexion SSE pour remonter la progression de la lecture d'un dépôt.
 */
export async function getDepotProgression(req: Request, res: Response): Promise<void> {
    if (req.params.session === undefined || req.params.code === undefined || req.params.depot === undefined) {
        throw new ErreurRequeteInvalide("Paramètres de requête manquants : sessionId, code et depotId sont requis");
    }

    // Récuperer et vérifier les paramètres de la requête
    const sessionId = parseInt(req.params.session as string);
    const code = req.params.code;
    const depotId = parseInt(req.params.depot as string);

    if (isNaN(sessionId) || isNaN(depotId)) {
        throw new ErreurRequeteInvalide("Paramètres de requête invalides : sessionId et depotId doivent être des nombres");
    }

    // Vérifier que le dépôt existe et correspond
    const depot = DepotsManager.getDepot(depotId);
    if (!depot || depot.codeEpreuve !== code) {
        throw new ErreurRequeteInvalide("Le dépôt spécifié n'existe pas ou ne correspond pas à l'épreuve.");
    }

    // Configurer la réponse pour les Server-Sent Events
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders(); // Envoyer les en-têtes immédiatement

    logInfo('depotProgression', 'Client connecté en SSE pour le dépôt #' + depotId + '.');

    depot.callback = (event: string, id: number, data: Record<string, unknown>) => {
        console.log(`remontée du message:\nevent: ${event}\ndata: ${JSON.stringify(data)}\n------------`);
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        res.write(message);
    };

    depot.onComplete = () => {
        depot.callback?.('ok', 0, {});
        res.end();
    };

    // Gérer la fermeture de la connexion par le client
    req.on("close", () => {
        console.log(`Client déconnecté de la progression du dépôt ${depotId}`);
        depot.callback = undefined;
        depot.onComplete = undefined;
    });
}