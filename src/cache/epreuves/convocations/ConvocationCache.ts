import { ResultSetHeader } from "mysql2";
import { DatabaseCacheBase } from "../../base/DatabaseCacheBase";
import { Convocation, ConvocationData } from "./Convocation";
import { Serialiseur } from "../../base/Serialiseur";

export class ConvocationCache extends DatabaseCacheBase<string /*codeAnonymat*/, Convocation, ConvocationData> {

    nomTable = "convocation";
    colonnesClePrimaire: string[] = ["id_session", "code_epreuve", "code_anonymat"];

    /** Cache des convocations supplémentaires */
    convocationsSupplementaires = new Map<string, Convocation>();

    /** Map des salles, avec le nb. de convocations dans chaque salle */
    effectifsSalle = new Map<string, number>();

    /** Liste de toutes les salles concernées */
    salles = new Set<string>();

    /** Nombre de copies déposées et reconnues (= nombre de convocations avec une note renseignée) */
    nbDepots = 0;

    static serialiseur = new Serialiseur<ConvocationData>([
        { nom: 'id_session', type: 'uint16' },
        { nom: 'code_epreuve', type: 'string' },
        { nom: 'numero_etudiant', type: 'uint64', nullable: true },
        { nom: 'code_anonymat', type: 'string' },
        { nom: 'note_quart', type: 'uint8', nullable: true },
        { nom: 'code_salle', type: 'string' },
        { nom: 'rang', type: 'uint16', nullable: true }
    ]);

    /**
     * Instancier un cache pour les convocations d'une épreuve donnée.
     * @param idSession
     * @param idEpreuve
     */
    constructor(idSession: number, idEpreuve: string) {
        super([idSession, idEpreuve]);
    }

    /**
     * Reconstruire les caches dérivés (convocations supplémentaires, effectifs par salle).
     */
    public reconstruireCache(): void {

        this.effectifsSalle.clear();
        this.salles.clear();
        this.nbDepots = 0;

        for (const convoc of this.values()) {

            if (convoc.codeAnonymat[0] === "Z") {
                // Convo supplémentaire : la mettre dans la liste dédiée et ne pas la renvoyer dans le cache principal
                this.convocationsSupplementaires.set(convoc.codeAnonymat, convoc);

                // Si aucun étudiant associé, alors ce n'est PAS une convo normale, on suppr du cache
                if (convoc.numeroEtudiant === null && convoc.noteQuart === null) this.deleteDuCache(convoc.codeAnonymat);
            }

            if (convoc.numeroEtudiant !== null || convoc.noteQuart !== null) {
                // Convo normale : compter le nombre de convocations par salle
                const nbConvocsSalle = this.effectifsSalle.get(convoc.codeSalle) ?? 0;
                this.effectifsSalle.set(convoc.codeSalle, nbConvocsSalle + 1);
                this.salles.add(convoc.codeSalle);

                if (convoc.noteQuart !== null) {
                    this.nbDepots += 1;
                }
            }

        }
    }

    /**
     * Recupère les convocs non supplémentaires et reconstruit les caches dérivés.
     * @param clause 
     * @param force 
     * @returns 
     */
    override async getAll(clause?: string, force?: boolean): Promise<Convocation[]> {
        await super.getAll(clause, force);
        this.reconstruireCache();

        return this.values();
    }

    override clear(): void {
        super.clear();
        this.convocationsSupplementaires.clear();
        this.effectifsSalle.clear();
        this.salles.clear();
    }

    override delete(id: string): Promise<ResultSetHeader> {
        const convoc = this.get(id);
        if (convoc) {
            // Si la convocation supprimée est une convocation normale, décrémenter le nombre de convocations dans la salle
            if (convoc.numeroEtudiant !== null || convoc.noteQuart !== null) {
                const nbConvocsSalle = this.effectifsSalle.get(convoc.codeSalle) ?? 0;
                if (nbConvocsSalle > 0) this.effectifsSalle.set(convoc.codeSalle, nbConvocsSalle - 1);
            }

            // Si la convocation supprimée est une convocation supplémentaire, la retirer de la liste dédiée
            if (convoc.codeAnonymat[0] === "Z") {
                this.convocationsSupplementaires.delete(convoc.codeAnonymat);
            }

            // Retirer la salle de la liste si elle n'a plus de convocations
            if (this.effectifsSalle.get(convoc.codeSalle) === 0) {
                this.salles.delete(convoc.codeSalle);
            }
        }

        return super.delete(id);
    }

    fromDatabase(data: ConvocationData): Convocation {
        return new Convocation(data);
    }

    getComposanteCache(element: Convocation): string {
        return element.codeAnonymat;
    }

    serialize(): Buffer {
        const buffers: Buffer[] = [];
        for (const convoc of this.values()) {
            buffers.push(ConvocationCache.serialiseur.serialize(convoc.toData()));
        }

        for (const convocSupp of this.convocationsSupplementaires.values()) {
            buffers.push(ConvocationCache.serialiseur.serialize(convocSupp.toData()));
        }

        return Buffer.concat(buffers);
    }

    public static deserialize(buffer: Buffer): Convocation[] {
        const res = this.serialiseur.deserializeMany(buffer);
        return res.map(data => {
            data.numero_etudiant = Number(data.numero_etudiant); // convertir en bigint (todo: string préférable?)
            return new Convocation(data);
        });
    }

}