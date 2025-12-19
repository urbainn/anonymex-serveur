import * as tf from "@tensorflow/tfjs-node";
import { Tensor, Tensor3D, Tensor4D } from "@tensorflow/tfjs-node";
import { Canvas, Image, ImageData } from "canvas";
import { existsSync } from "fs";
import { resolve } from "path";

const EMNIST_INPUT_SIZE = 28;
const EMNIST_NUM_CLASSES = 26;

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
     */
    public static async predire(source: EmnistImageSource, modele: TypesModeles): Promise<ResultatPrediction> {
        const model = await this.ensureModel(modele);
        const input = this.pretraitement(source);

        try {
            const prediction = model.predict(input);
            const logits = Array.isArray(prediction) ? prediction[0] : prediction;

            if (!(logits instanceof Tensor)) {
                throw new Error("Unexpected EMNIST model output format.");
            }

            const probabilitiesTensor = tf.softmax(logits);
            const probabilitiesArray = await probabilitiesTensor.data();

            logits.dispose();
            probabilitiesTensor.dispose();

            const probabilities = Array.from(probabilitiesArray) as number[];
            const { index, value } = this.getTopProbability(probabilities);

            return {
                probas: probabilities,
                indiceClasse: index,
                confiance: value,
                caractere: this.indexToChar(index)
            };
        } finally {
            input.dispose();
        }
    }

    /**
     * Assure que le modèle spécifié est chargé et prêt à être utilisé.
     * @param modele 
     * @returns 
     */
    private static async ensureModel(modele: TypesModeles): Promise<tf.LayersModel> {
        if (this.modeles[modele]) {
            return this.modeles[modele]!;
        }

        if (!this.promessesChargement[modele]) {
            if (!existsSync(this.CHEMINS[modele])) {
                throw new Error(`EMNIST model not found at ${this.CHEMINS[modele]}`);
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
                    throw error;
                });
        }

        return this.promessesChargement[modele]!;
    }

    /**
     * Prétraite l'image source pour la prédiction EMNIST (rendre compatible avec le modèle).
     * @param source 
     * @returns 
     */
    private static pretraitement(source: EmnistImageSource): Tensor4D {
        const tensor = this.toTensor3D(source);
        const batched = tf.tidy(() => {
            const floatImg = tensor.toFloat();
            const grayscale = floatImg.shape[2] === 1 ? floatImg : floatImg.mean(2).expandDims(2);
            const resized = tf.image.resizeBilinear(grayscale as Tensor3D, [EMNIST_INPUT_SIZE, EMNIST_INPUT_SIZE], true);
            const normalized = resized.div(255);
            // Align upright, black-on-white glyphs to raw EMNIST orientation used during training:
            // flip left-right, then transpose (inverse of EMNIST "fix"), then invert colors.
            //const mirrored = normalized.reverse(1);
            const rotated = normalized.transpose([1, 0, 2]);
            const inverted = tf.sub(1, rotated);

            return inverted.expandDims(0) as Tensor4D;
        }) as Tensor4D;

        tensor.dispose();
        return batched;
    }

    private static toTensor3D(source: EmnistImageSource): Tensor3D {
        if (source instanceof Tensor) {
            if (source.rank === 3) {
                return source.clone() as Tensor3D;
            }

            if (source.rank === 4) {
                if (source.shape[0] !== 1) {
                    throw new Error("Expected a batch of size 1 when providing a rank-4 tensor to TensorFlowCNN.");
                }

                return source.squeeze([0]) as Tensor3D;
            }

            throw new Error("Unsupported tensor rank for EMNIST preprocessing.");
        }

        if (Buffer.isBuffer(source) || source instanceof Uint8Array) {
            return tf.node.decodeImage(source, 1) as Tensor3D;
        }

        throw new Error("Unsupported image source type for EMNIST inference.");
    }

    private static getTopProbability(probabilities: number[]): { index: number; value: number } {
        let bestIndex = 0;
        let bestValue = Number.NEGATIVE_INFINITY;

        for (let i = 0; i < probabilities.length; i += 1) {
            if (probabilities[i]! > bestValue) {
                bestValue = probabilities[i]!;
                bestIndex = i;
            }
        }

        return { index: bestIndex, value: bestValue };
    }

    private static indexToChar(index: number): string {
        if (index < 0 || index >= EMNIST_NUM_CLASSES) {
            return "?";
        }

        return String.fromCharCode("A".charCodeAt(0) + index);
    }
}