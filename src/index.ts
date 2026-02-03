import { utilisateurCache } from "./cache/utilisateurs/UtilisateurCache";
import { Database } from "./core/services/database/Database";
import { indexRouter } from "./routes";
import { logInfo } from "./utils/logger";
import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import { lireBordereau } from "./core/lecture/lireBordereau";
import { genererBordereau } from "./core/generation/bordereau/genererBordereau";
import { genererFeuilleEmargement } from "./core/generation/emargement/genererFeuilleEmargement";
import { lectureXLSX } from "./core/xlsx/lectureXLSX";
import { interpretationXLSX } from "./core/xlsx/interpretationXLSX";
import { Session } from "./cache/sessions/Session";

interpretationXLSX(lectureXLSX('Init_ExamsVraiSessionMai25_ano.xlsx'), new Session({ "annee": 2026, "id_session": 1, "nom": "Session 1 mai 2026", "statut": 1 }))
/* genererBordereau({
    'format': 'A4',
    'longueurCodeAnonymat': 8,
    'longueurCodeEpreuve': 6,
    'version': 1,
}); */

/*genererFeuilleEmargement({
    noms: [
        ['Roberto Marquis Di Gorgonzola', 'Rastapopoulos Gorgonzola'],
        ["Alice", "Dupont"],
        ["Bob", "Martin"],
        ["Charlie", "Durand"],
        ["Diane", "Petit"],
        ["Émile", "Moreau"],
        ["Fiona", "Leroy"],
        ["Gabriel", "Roux"],
        ["Hélène", "Faure"],
        ["Igor", "Blanc"],
        ["Julie", "Garnier"],
        ["Kevin", "Chevalier"],
        ["Laura", "Mercier"],
        ["Marc", "Lemoine"],
        ["Nina", "Gauthier"],
        ["Olivier", "Garcia"],
        ["Paul", "Vidal"],
        ["Quentin", "Benoit"],
        ["Rachel", "Dupuis"],
        ["Sophie", "Marchand"],
        ["Thomas", "Caron"],
        ["Awa", "Fernandez"],
        ["Vladimir", "Leclerc"],
        ["Wei", "Julien"],
        ["Xiu", "Lefevre"],
        ["Yasmine", "Noel"],
        ["Zinedine", "Masson"],
        ["Aminata", "Lambert"],
        ["Brahim", "Guerin"],
        ["Chiara", "Perrin"],
        ["Djibril", "Renaud"],
        ["Elif", "Dupuy"],
        ["Feng", "Rolland"],
        ["Giulia", "Barbier"],
        ["Hamza", "Arnaud"],
        ["Isabelle", "Colin"],
        ["Jacques", "Guillot"],
        ["Karine", "Lemoine"],
        ["Louis", "Fabre"],
        ["Marie", "Brunet"],
        ["Nicolas", "Schmitt"],
        ["Océane", "Renard"],
        ["Pascal", "Gilles"],
        ["Quincy", "Lopez"],
        ["Romain", "Fontaine"],
        ["Sarah", "Chevallier"],
        ["Thierry", "Meyer"],
        ["Ugo", "Blanchard"],
        ["Valérie", "Roger"],
        ["William", "Henry"],
        ["Xéna", "Lucas"],
        ["Yannick", "Garnier"],
        ["Zoé", "Dupont"]
    ].sort((a, b) => a[1]!.localeCompare(b[1]!)) as [string, string][],
    version: 1,
});*/

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
