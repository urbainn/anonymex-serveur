import { Router } from "express";
import { useRest } from "../useRest";
import { getRecherche } from "./getRecherche";

const recherchesRouteur = Router();

// GET /session/:session/recherche?q=mon+terme

recherchesRouteur.get("/:session/recherche", (req, res) => useRest(
    () => {
        const sessionId = req.params.session;
        const query = req.query.q?.toString() ?? '';

        return getRecherche(sessionId, query);
    },
    req,
    res
));

export { recherchesRouteur };