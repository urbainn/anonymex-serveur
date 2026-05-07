import { Router } from "express";
import { useRest } from "../useRest";
import { getParametresCharteGraphique } from "./getParametresCharteGraphique";
import { postParametresUploadLogo } from "./postParametresUploadLogo";

const parametresRouteur = Router();

// GET /parametres/charte-graphique
parametresRouteur.get("/charte-graphique", (req, res) => {
    useRest(getParametresCharteGraphique, req, res);
});

// POST /parametres/charte-graphique/logo/(universite|faculte)
parametresRouteur.post("/charte-graphique/logo/:type", (req, res) => {
    useRest(() => postParametresUploadLogo(req.params.type, req.body.fichiers), req, res);
});

export { parametresRouteur };