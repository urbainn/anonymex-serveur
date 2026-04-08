type ChampType =
    | "int8" // max 127
    | "uint8" // max 255
    | "int16" // max 32 767
    | "uint16" // max 65 535
    | "uint64"
    | "string"
    | "boolean";
interface Champ<T> {
    nom: keyof T, // clé/prop de l'instance à sérialiser
    type: ChampType,
    nullable?: boolean,
}

type Schema<T> = Champ<T>[];

/**
 * Sérialise et désérialise les éléments en cache pour les sauvegardes au format binaire (`.anonymex`).
 * @template T Type de l'élément en cache à sérialiser/désérialiser
 */
export class Serialiseur<T> {
    private schema: Schema<T>;

    /**
     * @param schema Schéma de sérialisation de l'élément en cache \
     * (int8 = max 127, uint8 = max 255, int16 = max 32 767, uint16 = max 65 535)
     */
    constructor(schema: Schema<T>) {
        this.schema = schema;
    }

    /**
     * Sérialiser un élément en format binaire.
     * @param data Données brutes à sérialiser
     * @returns Buffer contenant les données sérialisées
     */
    public serialize(data: T): Buffer {
        const bufferArray: Buffer[] = [];

        for (const champ of this.schema) {
            // pour chaque champ
            const valeur = data[champ.nom];

            // Ajoute un octet de présence si le champ est nullable
            // e.g. '0' si la val est nulle, '1' sinon, suivi de la valeur si elle est présente
            if (valeur == null) {
                if (!champ.nullable) {
                    throw new Error(`Le champ ${(String(champ.nom))} ne peut pas être null lors de la sérialisation.`);
                }

                const presenceBuffer = Buffer.allocUnsafe(1);
                presenceBuffer.writeUInt8(0);
                bufferArray.push(presenceBuffer);
                continue;
            }

            if (champ.nullable) {
                const presenceBuffer = Buffer.allocUnsafe(1);
                presenceBuffer.writeUInt8(1);
                bufferArray.push(presenceBuffer);
            }

            let champBuffer: Buffer;

            switch (champ.type) {
                case "int8": {
                    champBuffer = Buffer.allocUnsafe(1);
                    champBuffer.writeInt8(valeur as number);
                    break;
                }
                case "uint8": {
                    champBuffer = Buffer.allocUnsafe(1);
                    champBuffer.writeUInt8(valeur as number);
                    break;
                }
                case "int16": {
                    champBuffer = Buffer.allocUnsafe(2);
                    champBuffer.writeInt16BE(valeur as number);
                    break;
                }
                case "uint16": {
                    champBuffer = Buffer.allocUnsafe(2);
                    champBuffer.writeUInt16BE(valeur as number);
                    break;
                }
                case "uint64": {
                    champBuffer = Buffer.allocUnsafe(8);
                    // caster en bigint pour éviter approx. ou débordement
                    const bigVal = BigInt(valeur as number);
                    champBuffer.writeBigUInt64BE(bigVal);
                    break;
                }
                case "string": {
                    // écrire la longueur de la str (sur 2 octets) + la str en utf-8
                    const strVal = valeur as string;
                    const strBuffer = Buffer.from(strVal, 'utf-8');
                    const lengthBuffer = Buffer.allocUnsafe(2);
                    lengthBuffer.writeUInt16BE(strBuffer.length);
                    champBuffer = Buffer.concat([lengthBuffer, strBuffer]);
                    break;
                }
                case "boolean": {
                    champBuffer = Buffer.allocUnsafe(1);
                    champBuffer.writeUInt8((valeur as boolean) ? 1 : 0);
                    break;
                }
                default:
                    throw new Error(`Type de champ inconnu pour la sérialisation : ${(champ.type)}`);
            }

            bufferArray.push(champBuffer);
        }

        return Buffer.concat(bufferArray);
    }

    /**
     * Désérialiser un buffer en un schema d'instance de l'élément en cache.
     * @param buffer Buffer contenant les données sérialisées
     * @returns SCHEMA de l'instance désérialisée
     */
    public deserialize(buffer: Buffer): Partial<T> {
        return this.deserializeAvecOffset(buffer, 0).data;
    }

    /**
     * Désérialiser un buffer contenant plusieurs instances sérialisées.
     * @param buffer Buffer contenant les données sérialisées (concaténation d'instances)
     * @returns Liste des instances désérialisées
     */
    public deserializeMany(buffer: Buffer): T[] {
        const instances: T[] = [];
        let offset = 0;

        while (offset < buffer.length) {
            const { data: instance, offset: nextOffset } = this.deserializeAvecOffset(buffer, offset);

            if (nextOffset <= offset) {
                throw new Error("La désérialisation n'a pas progressé, buffer potentiellement invalide.");
            }

            instances.push(instance);
            offset = nextOffset;
        }

        return instances;
    }

    private deserializeAvecOffset(buffer: Buffer, startOffset: number): {
        data: T,
        offset: number,
    } {
        const data: Partial<T> = {};
        let offset = startOffset;

        for (const champ of this.schema) {
            if (champ.nullable) {
                const isPresent = buffer.readUInt8(offset);
                offset += 1;

                if (!isPresent) {
                    data[champ.nom] = null as T[typeof champ.nom];
                    continue;
                }
            }

            let valeur: string | number | boolean | bigint;

            switch (champ.type) {
                case "int8":
                    valeur = buffer.readInt8(offset);
                    offset += 1;
                    break;
                case "uint8":
                    valeur = buffer.readUInt8(offset);
                    offset += 1;
                    break;
                case "int16":
                    valeur = buffer.readInt16BE(offset);
                    offset += 2;
                    break;
                case "uint16":
                    valeur = buffer.readUInt16BE(offset);
                    offset += 2;
                    break;
                case "uint64":
                    valeur = buffer.readBigUInt64BE(offset);
                    offset += 8;
                    break;
                case "string": {
                    const length = buffer.readUInt16BE(offset);
                    offset += 2;
                    valeur = buffer.toString('utf-8', offset, offset + length);
                    offset += length;
                    break;
                }
                case "boolean": {
                    valeur = buffer.readUInt8(offset) === 1;
                    offset += 1;
                    break;
                }
                default:
                    throw new Error(`Type de champ inconnu pour la désérialisation : ${(champ.type)}`);
            }

            data[champ.nom] = valeur as T[typeof champ.nom];
        }

        return {
            data: data as T,
            offset,
        };
    }
}