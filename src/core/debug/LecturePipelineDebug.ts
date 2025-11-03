import { promises as fsPromises } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { EtapeLecture, etapesDeLecture } from './EtapesDeTraitementDicts';

/**
 * Permet de sauvegarder des représentations visuelles des étapes de traitement du pipeline de lecture (pour le rapport/debug).
 */
export class LecturePipelineDebug {

    private static actif: boolean = true; // TODO: désactiver par défaut en prod

    public static isActif(): boolean {
        return this.actif;
    }

    public static setActif(actif: boolean): void {
        this.actif = actif;
    }

    /**
     * Enregistrer une image brute (raw) de debug du pipeline de lecture.
     * @param etapeLecture L'étape de lecture en cours
     * @param imageBuffer Buffer de l'image à sauvegarder
     * @param width Largeur de l'image
     * @param height Hauteur de l'image
     * @param channels Nombre de canaux de l'image
     */
    public static async enregistrerImageDebugRaw(etapeLecture: EtapeLecture, imageBuffer: Uint8Array | Uint8ClampedArray, width: number, height: number, channels: 1 | 3 | 4): Promise<void> {
        if (!this.actif) return;
        const [_, filePath] = await this.getInfosSauvegarde(etapeLecture);
        await sharp(imageBuffer, {
            raw: {
                width,
                height,
                channels
            }
        }).jpeg().toFile(filePath);
    }

    /**
     * Enregistre une image de debug du pipeline de lecture.
     * @param etapeLecture L'étape de lecture en cours
     * @param imageBuffer Buffer de l'image à sauvegarder
     */
    public static async enregistrerImageDebug(etapeLecture: EtapeLecture, imageBuffer: Buffer): Promise<void> {
        if (!this.actif) return;
        const [_, filePath] = await this.getInfosSauvegarde(etapeLecture);
        await sharp(imageBuffer)
            .jpeg()
            .toFile(filePath);
    }

    /**
     * Informations de sauvegarde d'une étape de lecture.
     * @param etapeLecture 
     * @returns [Numéro d'étape, Chemin du fichier]
     */
    private static async getInfosSauvegarde(etapeLecture: EtapeLecture): Promise<[number, string]> {
        // Vérifier que le répertoire de sauvegarde existe (sinon créer)
        const debugDir = path.resolve('debug', 'pipeline');
        await fsPromises.mkdir(debugDir, { recursive: true });

        // Infos de l'étape
        const [numeroEtape, nomEtape, nomFichier] = etapesDeLecture[etapeLecture];
        const filePath = path.join(debugDir, `${numeroEtape.toString().padStart(2, '0')}_${nomFichier}.jpg`);

        return [numeroEtape, filePath];
    }
}