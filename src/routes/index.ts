import { Router } from "express";
import { sessionsRouter } from "./sessions";
import { utilisateursRouter } from "./utilisateurs";
import { rolesRouteur } from "./roles";
import { useFile } from "./useFile";

const router = Router();

// Fichier reçu; traiter via useFile
// Les fichiers seront ajoutés au body avec le champ "fichiers"
router.use((req, res, next) => {
    const contentType = req.headers["content-type"];
    if (!contentType || !contentType.includes("multipart/form-data")) {
        next();
        return;
    }

    useFile(req, res, next);
});

router.use("/sessions", sessionsRouter);
router.use("/utilisateurs", utilisateursRouter);
router.use("/roles", rolesRouteur)

export { router as indexRouter };