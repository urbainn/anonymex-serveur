import * as tf from "@tensorflow/tfjs-node";
import { Tensor, Tensor3D, Tensor4D } from "@tensorflow/tfjs";
import { existsSync } from "fs";
import { resolve } from "path";
import { ErreurCNN } from "../lectureErreurs";

export type EmnistImageSource = Tensor3D | Tensor4D | Buffer | Uint8Array;
type TypesModeles = "EMNIST-Standard";

export interface ResultatPrediction {
    probas: number[];
    /** Indice de la classe prédite (0 = 'A', 1 = 'B', ..., 25 = 'Z') */
    indiceClasse: number;
    confiance: number;
    /** Caractère prédit */
    caractere: string;
}

/**
 * Classe pour effectuer des inférences sur les modèles EMNIST à l'aide de TensorFlow.js.
 */
export class TensorFlowCNN {

    /** Chemin vers le modèle EMNIST */
    private static readonly CHEMINS = {
        "EMNIST-Standard": resolve(process.cwd(), "resources", "models", "EMNIST", "model.json")
    };

    /** Poids des modèles chargés, par nom/type */
    private static modeles: Partial<Record<TypesModeles, tf.LayersModel | null>> = {};

    /** Promesses de chargement des modèles, par nom/type */
    private static promessesChargement: Partial<Record<TypesModeles, Promise<tf.LayersModel> | null>> = {};

    /**
     * Faire une prédiction sur une image donnée avec le modèle spécifié.
     * @param source image à prédire.
     * @param modele Type de modèle à utiliser pour la prédiction.
     * @param alphabet Alphabet utilisé dans le modèle dans l'ordre des classes
     */
    public static async predire(source: Tensor4D, modele: TypesModeles, alphabet: string): Promise<ResultatPrediction> {
        const model = await this.ensureModel(modele);

        try {
            const prediction = model.predict(source);
            const logits = Array.isArray(prediction) ? prediction[0] : prediction;

            if (!(logits instanceof Tensor)) {
                throw new ErreurCNN("Format de sortie du modèle EMNIST inattendu.");
            }

            const sortieArray = Array.from(await logits.data()) as number[];
            const sortieSembleNormalisee = this.isProbablyNormalizedProbabilities(sortieArray);

            let probabilitiesArray: number[];
            if (sortieSembleNormalisee) {
                probabilitiesArray = sortieArray;
            } else {
                const probabilitiesTensor = tf.softmax(logits);
                probabilitiesArray = Array.from(await probabilitiesTensor.data());
                probabilitiesTensor.dispose();
            }

            logits.dispose();

            const probabilities = probabilitiesArray;
            const { index, value } = this.getTopProbability(probabilities);

            return {
                probas: probabilities,
                indiceClasse: index,
                confiance: value,
                caractere: alphabet[index] ?? '?'
            };
        } finally {
            source.dispose();
        }
    }

    /**
     * Assure que le modèle spécifié est chargé et prêt à être utilisé.
     * @param modele 
     * @returns 
     */
    private static async ensureModel(modele: TypesModeles): Promise<tf.LayersModel> {
        if (this.modeles[modele]) {
            return this.modeles[modele];
        }

        if (!this.promessesChargement[modele]) {
            if (!existsSync(this.CHEMINS[modele])) {
                throw new ErreurCNN(`Modèle CNN EMNIST non trouvé au chemin : ${this.CHEMINS[modele]}`);
            }

            this.promessesChargement[modele] = tf
                .loadLayersModel(`file://${this.CHEMINS[modele]}`)
                .then((loadedModel: tf.LayersModel) => {
                    this.modeles[modele] = loadedModel;
                    return loadedModel;
                })
                .catch((error: Error) => {
                    this.promessesChargement[modele] = null;
                    console.log("Error loading EMNIST model:", error);
                    throw ErreurCNN.assigner(error);
                });
        }

        return this.promessesChargement[modele];
    }

    private static getTopProbability(probabilities: number[]): { index: number; value: number } {
        let bestIndex = 0;
        let bestValue = Number.NEGATIVE_INFINITY;

        for (let i = 0; i < probabilities.length; i += 1) {
            const prob = probabilities[i];
            if (prob === undefined) continue;
            if (prob > bestValue) {
                bestValue = prob;
                bestIndex = i;
            }
        }

        return { index: bestIndex, value: bestValue };
    }

    private static isProbablyNormalizedProbabilities(values: number[]): boolean {
        if (!values.length) {
            return false;
        }

        let sum = 0;
        for (const value of values) {
            if (!Number.isFinite(value) || value < 0 || value > 1) {
                return false;
            }
            sum += value;
        }

        return Math.abs(sum - 1) < 1e-3;
    }
}