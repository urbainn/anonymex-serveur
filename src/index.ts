import { utilisateurCache } from "./cache/utilisateurs/UtilisateurCache";
import { Database } from "./core/services/database/Database";
import { indexRouter } from "./routes";
import { logInfo } from "./utils/logger";
import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import { lireBordereau } from "./core/lecture/lireBordereau";
import { genererBordereau } from "./core/generation/bordereau/genererBordereau";

// lireBordereau('debug/pdf/TAS.pdf', 'application/pdf');

genererBordereau({ "format": "A4", "longueurCodeAnonymat": 6, "longueurCodeEpreuve": 0, "version": 1 });

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use("/api", indexRouter);

app.listen(port, () => {
    logInfo('serveur', `Serveur démarré sur le port ${port}`);
});
