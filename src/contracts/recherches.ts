import { z } from "zod";

export enum TypeRecherche {
    UE = 0,
    SALLE = 1,
    HEURE = 2,
    SALLEHEURE = 3,
    ACTION = 4,
    ETUDIANT = 5
}

const CodeUEData = {
    code: z.string()
}

const SalleData = {
    codeSalle: z.string()
}

const HeureData = {
    horodatage: z.string()
}

const ActionData = {
    action: z.number().int() // 1 : Télécharger le bordereau, 2 : Déposer des copies, 3 : Changer de session
}

const EtudiantData = {
    numero: z.number().int()
}

// --- Schémas ---

const BaseRechercheSchema = z.object({
    type: z.enum(TypeRecherche)
});

export const RechercheUESchema = BaseRechercheSchema.extend({
    type: z.literal(TypeRecherche.UE),
    ...CodeUEData
});

export const RechercheSalleSchema = BaseRechercheSchema.extend({
    type: z.literal(TypeRecherche.SALLE),
    ...SalleData
});

export const RechercheHeureSchema = BaseRechercheSchema.extend({
    type: z.literal(TypeRecherche.HEURE),
    ...HeureData
});

export const RechercheSalleHeureSchema = RechercheSalleSchema.extend({
    type: z.literal(TypeRecherche.SALLEHEURE),
    ...SalleData,
    ...HeureData
});

export const RechercheActionSchema = BaseRechercheSchema.extend({
    type: z.literal(TypeRecherche.ACTION),
    ...ActionData
})

export const RechercheEtudiantSchema = BaseRechercheSchema.extend({
    type: z.literal(TypeRecherche.ETUDIANT),
    ...EtudiantData
})

export const ListRechercheSchema = z.object({
    resultats: z.array(
        z.discriminatedUnion("type", [
            RechercheUESchema,
            RechercheSalleSchema,
            RechercheHeureSchema,
            RechercheSalleHeureSchema,
            RechercheActionSchema,
            RechercheEtudiantSchema
        ])
    )
})

// --- Types ---

export type APIRechercheUE = z.infer<typeof RechercheUESchema>;
export type APIRechercheSalle = z.infer<typeof RechercheSalleSchema>;
export type APIRechercheHeure = z.infer<typeof RechercheHeureSchema>;
export type APIRechercheSalleHeure = z.infer<typeof RechercheSalleHeureSchema>;
export type APIRechercheAction = z.infer<typeof RechercheActionSchema>;
export type APIRechercheEtudiant = z.infer<typeof RechercheEtudiantSchema>;
export type APIListRecherche = z.infer<typeof ListRechercheSchema>;

export type APIRechercheReponse = APIRechercheUE | APIRechercheSalle | APIRechercheHeure | APIRechercheSalleHeure | APIRechercheAction | APIRechercheEtudiant;
