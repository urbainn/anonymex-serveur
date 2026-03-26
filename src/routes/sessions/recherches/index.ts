import { Router } from "express";
import { useRest } from "../../useRest";
import { getRecherche } from "./getRecherche";

const recherchesRouteur = Router({ mergeParams: true });

// GET /session/:session/recherche?q=une+recherche

recherchesRouteur.get<{ session: string }>
    ("/", (req, res) => useRest(() => getRecherche(req.params.session, req.query.q?.toString() ?? ''), req, res));

export { recherchesRouteur as recherchesRouteur };