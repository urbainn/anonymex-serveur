import sharp from "sharp";
import { MediaService } from "../core/services/MediaService";

interface ImageImporte {
    buffer: Buffer;
    width: number;
    height: number;
    format?: string;
}

/**
 * Cache contenant des images importées (e.g: logo université), transformées 
 * et modifiées pour être utilisées facilement (dans les PDFs notamment).
 */
export class ImagesImportsCache {
    private static cache = new Map<string, ImageImporte | null>();

    /** Réduit une image à une taille maximale (sans la déformer) */
    private static reduireTransfn(a: sharp.Sharp, maxw: number, maxh: number): sharp.Sharp {
        return a.resize({ width: maxw, height: maxh, fit: "inside", withoutEnlargement: true });
    }

    /** Transforme en noir et blanc */
    private static noirEtBlancTransfn(a: sharp.Sharp, couleurNoir = "#000000"): sharp.Sharp {
        return a
            .grayscale()
            .toColourspace("b-w")
            .tint(couleurNoir);
    }

    /**
     * Renvoit les logos de l'université et de la faculté.
     */
    public static async getLogos(force = false) {
        const universite = await this.getImageImporte("logo_universite",
            a => this.noirEtBlancTransfn(this.reduireTransfn(a, 238, 102)), force);
        const faculte = await this.getImageImporte("logo_faculte",
            a => this.noirEtBlancTransfn(this.reduireTransfn(a, 238, 102)), force);

        return { universite, faculte };
    }

    /**
     * Enregistre une image sur le disque.
     * @param nom Le nom du fichier de l'image (sans extension)
     * @param buffer Le contenu de l'image
     */
    public static async enregistrerImage(nom: string, buffer: Buffer) {
        await MediaService.enregistrerMedia("imports", nom, buffer);
        // Invalider le cache pour que la nouvelle image soit prise en compte
        this.cache.delete(nom);
    }

    /**
     * Récupérer une image importée et la mettre en cache.
     * @param nom Le nom du fichier de l'image (sans extension)
     * @param transfn fn de transformation à appliquer à l'image (sharp) avant de la stocker dans le cache
     * @param force forcer la relecture depuis le disque
     * @returns 
     */
    private static async getImageImporte(nom: string, transfn?: (s: sharp.Sharp) => sharp.Sharp, force = false): Promise<ImageImporte | null> {
        let image = this.cache.get(nom);
        if (!image || force) {
            const buffer = await MediaService.lireMedia("imports", nom, transfn).catch(() => null);

            if (buffer === null) {
                this.cache.set(nom, null);
                return null;
            }

            const { width, height, format } = await sharp(buffer).metadata();

            image = { buffer, width, height, format };
            this.cache.set(nom, image);

        }
        return image;
    }
}