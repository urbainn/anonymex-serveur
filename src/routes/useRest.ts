import { Request, Response } from "express";
import { ZodError } from "zod";
import { ErreurAccesRefuse, ErreurNonAuthentifie, ErreurRequeteInvalide } from "./erreursApi";

/**
 * Permet d'utiliser une fonction REST standardisée.
 * @param fn La fonction à exécuter. Ce qu'elle renvoit sera envoyé en JSON.
 * @param req 
 * @param res 
 */
export function useRest(fn: (req: Request) => Promise<any>, req: Request, res: Response) {
    // plus tard(TODO) : authentification
    fn(req)
        .then((data) => res.json(data))
        .catch((error) => {
            // Erreur de validation Zod
            if (error instanceof ZodError) {
                res.status(400).json({ error: "Requête invalide ou mal formée" });
            } else if (error instanceof ErreurRequeteInvalide) {
                res.status(400).json({ error: error.message ?? "Requête invalide ou mal formée" });
            } else if (error instanceof ErreurNonAuthentifie) {
                res.status(401).json({ error: "Non authentifié" });
            } else if (error instanceof ErreurAccesRefuse) {
                res.status(403).json({ error: error.message ?? "Accès refusé" });
            } else {
                console.error(error);
                res.status(500).json({ error: "Internal Server Error" });
            }
        });
}