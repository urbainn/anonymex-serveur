import { createWorker, Worker, WorkerParams, PSM, OEM } from "tesseract.js";

export class TesseractOCR {

    private static worker: Worker;

    /**
     * Récupérer le worker singleton Tesseract courant
     * @returns 
     */
    private static async getWorker() {
        if (this.worker) {
            return this.worker;
        }

        this.worker = await createWorker('eng');
        return this.worker;
    }

    /**
     * Changer les paramètres du worker OCR
     * @param params 
     */
    public static async setParams(params: Partial<WorkerParams & Record<string, string | number>>) {
        const worker = await this.getWorker();
        await worker.setParameters(params);
    }

    /**
     * Configuration type pour maximiser la reconnaissance de caractères uniques
     */
    public static async configurerModeCaractereUnique(whitelist: string, dpi = 300) {
        await this.setParams({
            tessedit_char_whitelist: whitelist,
            tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
            tessedit_ocr_engine_mode: OEM.LSTM_ONLY,
            user_defined_dpi: String(dpi),
            load_system_dawg: '0', // dictionnaires désactivés
            load_freq_dawg: '0',
            load_punc_dawg: '0',
            load_number_dawg: '0',
            load_unambig_dawg: '0',
            textord_tabfind_vertical_text: '0', // désactiver la détection de texte vertical
            textord_tabfind_find_tables: '0', // désactiver la détection de tableaux
            tessedit_do_invert: '0',
            invert_threshold: '0',
            min_orientation_margin: '999' // seuil élevé pour éviter les rotations automatiques
        });
    }

    /**
     * Effectuer la reconnaissance OCR sur une image
     * @param img Image (sharp, buffer, chemin fichier, ...)
     * @returns 
     */
    public static async interroger(img: Buffer): Promise<{ text: string; confidence: number }> {
        const worker = await this.getWorker();
        const { data: { text, confidence } } = await worker.recognize(img);
        return { text, confidence };
    }

}