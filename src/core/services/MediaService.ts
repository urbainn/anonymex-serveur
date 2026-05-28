import { Mat } from "@techstark/opencv-js";
import sharp, { Channels } from "sharp";
import { mkdir, unlink, writeFile } from "fs/promises";
import { join } from "path";

/**
 * Enregistrer, lire, sérialiser et désérialiser les médias enregistrés dans le système (copies, ROIs, etc.)
 */
export class MediaService {

    static readonly mediaDir = "./media";

    /** Liste des répertoires vérifiés. */
    private static dirsVerifies = new Set<string>();

    /**
     * Chemin de stockage des incidents d'une session
     * @param sessionId l'id de la session
     */
    static getIncidentDir(sessionId: number): string {
        return join('session-' + sessionId.toString(), 'incidents');
    }

    /**
     * Chemin de stockage des scans d'un examen
     * @param sessionId l'id de la session
     * @param codeEpreuve le code de l'épreuve
     */
    static getExamScansDir(sessionId: number, codeEpreuve: string): string {
        return join('session-' + sessionId.toString(), codeEpreuve);
    }

    /**
     * Encoder une Mat en Sharp
     */
    static async encoderMatToSharp(mat: Mat): Promise<sharp.Sharp> {
        const width = mat.cols;
        const height = mat.rows;
        const channels = mat.channels() as Channels;

        // en sharp
        const image = sharp(mat.data, {
            raw: {
                width,
                height,
                channels
            }
        });

        return image;
    }

    /**
     * Enregistrer une Mat dans le système de fichiers. format WebP. Créé les dossiers nécessaires.
     * @param mat la Mat à enregistrer
     * @param chemin les sous-dossiers dans lesquels enregistrer le fichier (ex: "incidents/1/")
     * @param filename le nom du fichier (ex: "scan.webp")
     * @param quality la qualité de l'image (0-100)
     */
    static async enregistrerMat(mat: Mat, chemin: string, filename: string, quality = 80): Promise<void> {
        // Encoder la Mat en Sharp
        const image = await this.encoderMatToSharp(mat);

        // Créer les dossiers nécessaires
        const dirPath = join(this.mediaDir, chemin);
        if (!this.dirsVerifies.has(dirPath)) {
            await mkdir(dirPath, { recursive: true });
            this.dirsVerifies.add(dirPath);
        }

        // Enregistrer l'image
        await image.webp({ quality }).toFile(join(dirPath, filename));
    }

    /**
     * Enregistrer un buffer dans le système de fichiers. Créé les dossiers nécessaires.
     * @param chemin les sous-dossiers dans lesquels enregistrer le fichier (ex: "incidents/1/")
     * @param filename le nom du fichier (ex: "scan.webp")
     * @param buffer le buffer à enregistrer
     */
    static async enregistrerMedia(chemin: string, filename: string, buffer: Buffer): Promise<void> {
        // Créer les dossiers nécessaires
        const dirPath = join(this.mediaDir, chemin);
        if (!this.dirsVerifies.has(dirPath)) {
            await mkdir(dirPath, { recursive: true });
            this.dirsVerifies.add(dirPath);
        }

        await writeFile(join(dirPath, filename), buffer);
    }

    /**
     * Changer l'emplacement d'un média (ex: déplacer un scan d'incident vers le dossier final des scans d'examen)
     * @param ancienChemin les sous-dossiers dans lesquels se trouve actuellement le fichier (ex: "incidents/1/")
     * @param nouveauChemin les sous-dossiers dans lesquels déplacer le fichier (ex: "session-1/epreuveX/")
     * @param ancienFilename le nom actuel du fichier (ex: "scan.webp")
     * @param nouveauFilename le nouveau nom du fichier (ex: "Z1234.webp")
     */
    static async deplacerMedia(ancienChemin: string, nouveauChemin: string, ancienFilename: string, nouveauFilename: string): Promise<void> {
        // sécurité : vérifier que le chemin est bien un MEDIA
        if (!['.webp', '.jpg', '.jpeg', '.png'].some(ext => ancienFilename.endsWith(ext))) {
            throw new Error("Tentative de déplacement d'un fichier qui n'est pas un média reconnu : " + ancienFilename);
        }

        const ancienPath = join(this.mediaDir, ancienChemin, ancienFilename);
        const nouveauPath = join(this.mediaDir, nouveauChemin, nouveauFilename);

        // Créer les dossiers nécessaires pour le nouveau chemin
        const nouveauDirPath = join(this.mediaDir, nouveauChemin);
        if (!this.dirsVerifies.has(nouveauDirPath)) {
            await mkdir(nouveauDirPath, { recursive: true });
            this.dirsVerifies.add(nouveauDirPath);
        }

        await writeFile(nouveauPath, await sharp(ancienPath).toBuffer());
        await unlink(ancienPath);
    }

    /**
     * Supprimer un fichier média quelconque (.webp, etc.)
     * @param chemin les sous-dossiers dans lesquels se trouve le fichier (ex: "incidents/1/")
     * @param filename le nom du fichier (ex: "scan.webp")
     */
    static async supprimerMedia(chemin: string, filename: string): Promise<void> {
        // sécurité : vérifier que le chemin est bien un MEDIA
        if (!['.webp', '.jpg', '.jpeg', '.png'].some(ext => filename.endsWith(ext))) {
            throw new Error("Tentative de suppression d'un fichier qui n'est pas un média reconnu : " + filename);
        }

        const filePath = join(this.mediaDir, chemin, filename);
        await unlink(filePath);
    }

    /**
     * Lire un média et le retourner sous forme de buffer.
     * @param chemin les sous-dossiers dans lesquels se trouve le fichier (ex: "incidents/1/")
     * @param filename le nom du fichier (ex: "scan.webp")
     * @param transfn une fonction de transformation à appliquer aux données lues 
     */
    static async lireMedia(chemin: string, filename: string, transfn?: (s: sharp.Sharp) => sharp.Sharp): Promise<Buffer> {
        const filePath = join(this.mediaDir, chemin, filename);

        // Lecture d'un fichier image : retourner un tableau avec un seul buffer
        let image = sharp(filePath);
        if (transfn) image = transfn(image);
        
        return await image.toBuffer();

    }

}