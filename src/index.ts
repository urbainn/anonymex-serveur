import { utilisateurCache } from "./cache/utilisateurs/UtilisateurCache";
import { Database } from "./core/services/Database";
import { indexRouter } from "./routes";
import { logInfo } from "./utils/logger";
import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import { lireBordereau } from "./core/lecture/lireBordereau";
import { genererBordereau } from "./core/generation/bordereau/genererBordereau";

genererBordereau({
    'format': 'A4',
    'longueurCodeAnonymat': 8,
    'longueurCodeEpreuve': 6,
    'version': 1,
});

//lireBordereau('debug/pdf/test.pdf')

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use("/api", indexRouter);

app.listen(port, () => {
    logInfo('serveur', `Serveur démarré sur le port ${port}`);
});
