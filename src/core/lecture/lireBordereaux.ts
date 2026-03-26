import { Fichier } from "../../routes/useFile";
import { Mat } from "@techstark/opencv-js";
//import { matToSharp } from "../../utils/imgUtils";
import { BenchmarkUnitaireModule } from "../generation/bordereau/modules/cadre-etudiant/BenchmarkUnitaireModule";
//import { OpenCvInstance } from "../services/OpenCvInstance";
import { TensorFlowCNN } from "./CNN/TensorFlowCNN";
import { Depot } from "./DepotsManager";
import { ErreurResultatLu } from "./lectureErreurs";
import { preprocessPipelines } from "./OCR/preprocessPipelines";
import { TesseractOCR } from "./OCR/TesseractOCR";
import { decouperROIs } from "./preparation/decouperROIs";
//import { detecterAprilTags } from "./preparation/detecterAprilTags";
import { extraireScans } from "./preparation/extraireScans";
import { preparerScan } from "./preparation/preparerScan";
import { sessionCache } from "../../cache/sessions/SessionCache";
import { IncidentData } from "../../cache/epreuves/incidents/Incident";
import { config } from "../../config";

const MARGE_CIBLES_MM = 10;
const DIAMETRE_CIBLES_MM = 8;

export type CallbackLecture = (event: string, id: number, data: Record<string, unknown>) => void;

export async function lireBordereaux(fichiers: Fichier[], getDepot: () => Depot): Promise<void> {

    // Configurer tesseract
    await TesseractOCR.configurerModeCaractereUnique(config.codesAnonymat.alphabetCodeAnonymat);

    // Récupérer les positions des ROIs du modèle de bordereau
    const rois = new BenchmarkUnitaireModule().getZonesLecture();

    // Récupérer la session et l'épreuve depuis le dépôt
    const sessionId = getDepot().sessionId;
    const codeEpreuve = getDepot().codeEpreuve;

    // Récupérer les instances
    const session = await sessionCache.getOrFetch(sessionId);
    const epreuve = await session?.epreuves.getOrFetch(codeEpreuve);
    if (!session || !epreuve) {
        getDepot().callback?.('error', 0, { message: 'Session ou épreuve introuvable' });
        return;
    }

    let numFichier = 0;
    for (const fichier of fichiers) {
        const document = { data: fichier.buffer, encoding: 'buffer', mimeType: fichier.mimetype };

        // Extraire tous les scans du document
        await extraireScans(document, async (scan, buffer) => {
            let scanPret: Mat | null = null;
            try {
                // Préparer et ajuste le scan (découpage, rotation, ...).
                scanPret = await preparerScan(scan, buffer);

                // TEMPORAIRE (BENCHMARK) : détecter les April Tags pour récupérer le code de l'épreuve
                //const detections = await detecterAprilTags(scan, matToSharp(await OpenCvInstance.getInstance(), scanPret));
                //const code = detections.sort((a, b) => a.center[0] - b.center[0]).map(d => String.fromCharCode(d.id));

                // Code lu ('' = échec de lecture)
                const codeLu: string[] = [];

                // Découper les lettres du code d'anonymat, et les lire
                await decouperROIs(scanPret, rois.lettresCodeAnonymat, DIAMETRE_CIBLES_MM, MARGE_CIBLES_MM, "A4",
                    async (roiAnonymat) => {

                        // Pré-processing de la ROI
                        const roiAnonPrete = await preprocessPipelines.initial(roiAnonymat.clone())
                            .resize({
                                width: 128, height: 128, fit: "contain", background: { r: 255, g: 255, b: 255 },
                                kernel: "lanczos3"
                            }).png().toBuffer();

                        // Interroger l'OCR
                        const { text, confidence } = await TesseractOCR.interroger(roiAnonPrete);

                        // Interroger la CNN
                        const prediction = await TensorFlowCNN.predire(
                            await preprocessPipelines.emnist(roiAnonymat).png().toBuffer(), 'EMNIST-Standard',
                            config.codesAnonymat.alphabetCodeAnonymat
                        );

                        // Décider du caractère lu en fonction des résultats de l'OCR et de la CNN
                        if (prediction.caractere === text.trim()[0])
                            codeLu.push(prediction.caractere);
                        else if (confidence > 0.8)
                            codeLu.push(text.trim()[0] ?? '');
                        else if (prediction.confiance > 0.85)
                            codeLu.push(prediction.caractere);
                        else
                            codeLu.push('');

                    });

                if (codeLu.includes('')) {
                    const codeLuPartiel = codeLu.map(c => c === '' ? '?' : c).join('');
                    throw new ErreurResultatLu('Échec de lecture du code anonymat', codeLuPartiel);
                }

            } catch (error) {
                // Erreur lors de la lecture du bordereau : faire remonter l'erreur
                if (error instanceof ErreurResultatLu && error.incident) {

                    // Créer un incident
                    const incidentData: Omit<IncidentData, 'id_incident'> = {
                        id_session: sessionId,
                        code_epreuve: codeEpreuve,
                        titre: error.name,
                        details: error.message,
                        code_anonymat: error.codeAnonymatLu ?? null,
                        note_quart: error.noteLue ? error.noteLue * 4 : null
                    };

                    // Insérer l'incident en base de données et en cache
                    const incidentInsert = await epreuve.incidents.insert(incidentData);
                    const incidentId = incidentInsert.insertId;
                    if (incidentInsert.affectedRows === 0 || incidentId === undefined) {
                        getDepot().callback?.('error', 0, { message: 'Erreur lors de la création d\'un incident' });
                        console.error("Erreur lors de la création de l'incident :", incidentInsert);
                        return;
                    }

                    const nvIncidentData = { ...incidentData, id_incident: incidentId };
                    const incident = epreuve.incidents.fromDatabase(nvIncidentData);
                    epreuve.incidents.set(incidentId, incident);

                    // Remonter l'incident au client
                    getDepot().callback?.('incident', 0, nvIncidentData);

                } else if (error instanceof Error) {
                    getDepot().callback?.('error', 0, { message: error.message });
                    console.error("Erreur lors de la lecture du bordereau :", error);
                } else {
                    getDepot().callback?.('error', 0, { message: 'Erreur inconnue' });
                    console.error("Erreur inconnue lors de la lecture du bordereau :", error);
                }
            } finally {
                // Libérer la mémoire du scan préparé
                scanPret?.delete();

                numFichier++;
                getDepot().callback?.('progress', 0, { n: numFichier, t: scan.nbPages });
            }
        });
    }

    // Envoi du message de fin de lecture
    getDepot().onComplete?.();


}