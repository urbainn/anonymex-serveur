import { Mat } from "@techstark/opencv-js";
import sharp, { Channels } from "sharp";
import { mkdir, unlink } from "fs/promises";

/**
 * Enregistrer, lire, sérialiser et désérialiser les médias enregistrés dans le système (copies, ROIs, etc.)
 */
export class MediaService {

    static readonly mediaDir = "./media";

    /** Liste des répertoires vérifiés. */
    private static dirsVerifies = new Set<string>();

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
     * @param dirnames les sous-dossiers dans lesquels enregistrer le fichier (ex: "incidents/1/")
     * @param filename le nom du fichier (ex: "scan.webp")
     * @param quality la qualité de l'image (0-100)
     */
    static async enregistrerMat(mat: Mat, dirnames: string, filename: string, quality = 80): Promise<void> {
        // Encoder la Mat en Sharp
        const image = await this.encoderMatToSharp(mat);

        // Créer les dossiers nécessaires
        const dirPath = `${this.mediaDir}/${dirnames}`;
        if (!this.dirsVerifies.has(dirPath)) {
            await mkdir(dirPath, { recursive: true });
            this.dirsVerifies.add(dirPath);
        }

        // Enregistrer l'image
        await image.webp({ quality }).toFile(`${dirPath}/${filename}`);
    }

    /**
     * Supprimer un fichier média quelconque (.anonmedia, .webp, etc.)
     * @param dirnames les sous-dossiers dans lesquels se trouve le fichier (ex: "incidents/1/")
     * @param filename le nom du fichier (ex: "scan.webp")
     */
    static async supprimerMedia(dirnames: string, filename: string): Promise<void> {
        // sécurité : vérifier que le chemin est bien un MEDIA
        if (!filename.endsWith('.anonmedia') && !filename.endsWith('.webp')) {
            throw new Error("Tentative de suppression d'un fichier qui n'est pas un média : " + filename);
        }

        const filePath = `${this.mediaDir}/${dirnames}/${filename}`;
        await unlink(filePath);
    }

    /**
     * Lire un média et le retourner sous forme de buffers.
     * Si plusieurs médias sont empaquetés (.anonmedia), alors retourne un tableau de buffers.
     * @param dirnames les sous-dossiers dans lesquels se trouve le fichier (ex: "incidents/1/")
     * @param filename le nom du fichier (ex: "scan.anonmedia")
     */
    static async lireMedia(dirnames: string, filename: string): Promise<Buffer[]> {
        const filePath = `${this.mediaDir}/${dirnames}/${filename}`;

        if (filename.endsWith('.anonmedia')) {

            // TODO!

        } else if (filename.endsWith('.webp')) {

            // Lecture d'un fichier WebP : retourner un tableau avec un seul buffer
            const buffer = await sharp(filePath).toBuffer();
            return [buffer];

        } else {
            throw new Error("Tentative de lecture d'un fichier qui n'est pas un média : " + filename);
        }

        return [];
    }

}