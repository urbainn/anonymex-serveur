import { Fichier } from "../../routes/useFile";
import { Mat } from "@techstark/opencv-js";
import { Depot } from "./DepotsManager";
import { ErreurResultatLu } from "./lectureErreurs";
import { TesseractOCR } from "./OCR/TesseractOCR";
import { extraireScans } from "./preparation/extraireScans";
import { preparerScan } from "./preparation/preparerScan";
import { sessionCache } from "../../cache/sessions/SessionCache";
import { IncidentData } from "../../cache/epreuves/incidents/Incident";
import { config } from "../../config";
import { MediaService } from "../services/MediaService";
import { logInfo } from "../../utils/logger";
import { lireGrilleNote } from "./bordereau/lireGrilleNote";
import { lireCodeAnonymat } from "./bordereau/lireCodeAnonymat";
import { getDecalages, inverserDecalage } from "../../utils/codeAnonymatUtils";

export const MARGE_CIBLES_MM = 17;
export const DIAMETRE_CIBLES_MM = 9;

export type CallbackLecture = (event: string, id: number, data: Record<string, unknown>) => void;

const ALPHABET = config.codesAnonymat.alphabetCodeAnonymat;

export async function lireBordereaux(fichiers: Fichier[], getDepot: () => Depot): Promise<void> {

    // Configurer tesseract
    await TesseractOCR.configurerModeCaractereUnique(ALPHABET);

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

    // Recupérer les valeurs de décalage pour l'épreuve
    const decalages = getDecalages(epreuve.idDecalage, ALPHABET);

    // Mettre en cache toutes les convocs. de l'épreuve pour lookup rapide
    await epreuve.convocations.getAll();

    let numFichier = 0;
    for (const fichier of fichiers) {
        const document = { data: fichier.buffer, encoding: 'buffer', mimeType: fichier.mimetype };

        // Extraire tous les scans du document
        await extraireScans(document, async (scan, buffer) => {
            let scanPret: Mat | null = null;
            try {
                // Préparer et ajuste le scan (découpage, rotation, ...).
                scanPret = await preparerScan(scan, buffer);

                // Liste des erreurs rencontrées
                const erreurs: Error[] = [];

                // Lire la note
                const noteLue = await lireGrilleNote(scanPret)
                    .catch(err => { erreurs.push(err); return null; });

                // Lire le code d'anonymat
                const codeLu = await lireCodeAnonymat(scanPret)
                    .catch(err => { erreurs.push(err); return null; });

                // Interpréter les resultats de lecture
                const codeAnonymat: (string | null)[] = [];
                if (codeLu) {
                    for (const caseCode of codeLu) {
                        if (!caseCode) {
                            codeAnonymat.push(null);
                            continue;
                        }

                        // Lire le char reconnu par le CNN et l'OCR
                        const charCnn = caseCode.cnn.caractere.trim()[0] ?? null;
                        let charOcr = caseCode.ocr.caractere.trim()[0] ?? null;
                        if (charOcr === '') charOcr = null;

                        if (charCnn === charOcr && caseCode.cnn.confiance >= 0.5) {
                            // CNN et OCR sont d'accord
                            codeAnonymat.push(charCnn);
                        } else if (caseCode.cnn.confiance >= 0.8 && charCnn !== null) {
                            // Confiance CNN > 0.8
                            codeAnonymat.push(charCnn);
                        } else if (caseCode.ocr.confiance >= 80 && charOcr !== null) {
                            // Confiance OCR > 80
                            codeAnonymat.push(charOcr);
                        } else {
                            codeAnonymat.push(null);
                        }
                    }
                }

                // Compléter le code en utilisant la valeur de report
                for (let i = 0; i < codeAnonymat.length; i++) {
                    const radical = i <= 2;
                    const indexReport = radical ? i + 3 : i - 3; // les cases 1,2,3 reportent sur 4,5,6 et inversement
                    const lettreReportee = codeAnonymat[indexReport];
                    const decalage = decalages[i % decalages.length];
                    if (codeAnonymat[i] === null && lettreReportee !== null && lettreReportee !== undefined && decalage !== undefined) {
                        codeAnonymat[i] = inverserDecalage(lettreReportee, radical ? decalage : -decalage, ALPHABET);
                    }
                }

                // Remplacer les caractères non reconnus par '?' pour constituer le code d'anonymat final
                const codeAnonymatFinal = codeAnonymat.map(c => c ?? '?').join('');

                // Remonter les erreurs
                if (erreurs.length > 0) {
                    // Première erreur de type incident
                    const erreurPrimaire = erreurs.find(e => e instanceof ErreurResultatLu);
                    if (erreurPrimaire) {
                        // Assigner les données de lecture partielle si disponibles
                        if (erreurPrimaire.codeAnonymatLu === undefined) erreurPrimaire.codeAnonymatLu = codeAnonymatFinal;
                        if (erreurPrimaire.noteLue === undefined && noteLue) erreurPrimaire.noteLue = noteLue;

                        const messages = erreurs.filter(e => e.message).map(e => e.message).join(' | ');
                        erreurPrimaire.message = messages;

                        throw erreurPrimaire;
                    } else {
                        throw erreurs[0];
                    }
                }

                // Trouver la convocation correspondante (normale ou supplémentaire)
                const convocation = epreuve.convocations.get(codeAnonymatFinal) ?? epreuve.convocations.convocationsSupplementaires.get(codeAnonymatFinal);
                if (!convocation) {
                    throw new ErreurResultatLu(`Code d'anonymat non reconnu.`, codeAnonymatFinal, noteLue ?? undefined);
                }

                if (convocation.noteQuart !== null && convocation.noteQuart !== noteLue) {
                    throw new ErreurResultatLu("Code anonymat déjà lu.");
                }

                // Mettre à jour la convocation avec la note lue
                if (noteLue !== null) {
                    convocation.noteQuart = noteLue * 4;
                    await epreuve.convocations.update(codeAnonymatFinal, { note_quart: noteLue * 4 });
                }

            } catch (error) {
                // Erreur lors de la lecture du bordereau : faire remonter l'erreur
                if (error instanceof ErreurResultatLu && error.incident && scanPret) {

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

                    // Enregistrer le scan sur le disque
                    await MediaService.enregistrerMat(scanPret, 'incidents/', `${incidentId}.webp`);

                    logInfo('Incident', "Incident créé lors de la lecture d'un bordereau.");

                    // Remonter l'incident au client
                    getDepot().callback?.('incident', 0, incident.toJSON());

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

        // Reconstruire le cache des convocations de l'épreuve pour refléter les mises à jour
        epreuve.convocations.reconstruireCache();
    }

    // Envoi du message de fin de lecture
    getDepot().onComplete?.();


}