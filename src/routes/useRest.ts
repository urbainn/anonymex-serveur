import { Request, Response } from "express";

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
            console.error(error);
            res.status(500).json({ error: "Internal Server Error" });
        });
}