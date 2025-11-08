import { indexRouter } from "./routes";
import { logInfo } from "./utils/logger";
import cors from "cors";
import express from "express";

//lireBordereau('debug/img/test_orientation.jpg');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use("/api", indexRouter);

app.listen(port, () => {
    logInfo('serveur', `Serveur démarré sur le port ${port}`);
});