import { createWorker, Worker, WorkerParams } from "tesseract.js";

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
    public static async setParams(params: Partial<WorkerParams>) {
        const worker = await this.getWorker();
        await worker.setParameters(params);
    }

    /**
     * Effectuer la reconnaissance OCR sur une image
     * @param img Image (sharp, buffer, chemin fichier, ...)
     * @returns 
     */
    public static async interroger(img: Buffer): Promise<string> {
        const worker = await this.getWorker();
        const { data: { text } } = await worker.recognize(img);
        return text;
    }

}