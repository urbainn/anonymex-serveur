import busboy from 'busboy';
import express from 'express';

interface Fichier {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}

export function useFile(req: express.Request, res: express.Response, next: express.NextFunction) {

    const bb = busboy({
        headers: req.headers,
        limits: {
            files: 1,
            fileSize: 100 * 1024 * 1024, // Max 100MB
        },
    });

    // Liste des champs (métadonnées) du fichier en réception
    // Pas exploité pour l'instant, mais peut s'avérer utile
    const fields: Record<string, string | string[]> = {};

    const fichiers: Fichier[] = [];
    let errorMessage: string | null = null;

    bb.on("field", (name, value) => {
        const existing = fields[name];
        if (!existing) {
            fields[name] = value;
        } else if (Array.isArray(existing)) {
            existing.push(value);
        } else {
            fields[name] = [existing, value];
        }
    });

    bb.on("file", (fieldname, file, info) => {
        const chunks: Buffer[] = [];

        file.on("data", (data) => {
            chunks.push(data);
        });

        file.on("limit", () => {
            errorMessage = "Fichier trop volumineux.";
            file.resume();
        });

        file.on("end", () => {
            const buffer = Buffer.concat(chunks);
            fichiers.push({
                fieldname,
                originalname: info.filename,
                encoding: info.encoding,
                mimetype: info.mimeType,
                size: buffer.length,
                buffer,
            });
        });
    });

    bb.on("error", (err) => {
        errorMessage = err instanceof Error ? err.message : typeof err === "string" ? err : "Erreur inconnue";
    });

    bb.on("close", () => {
        if (errorMessage) {
            res.status(400).send(errorMessage);
            return;
        }

        req.body = { ...req.body, fichiers };
        next();
    });

    req.pipe(bb);
};
