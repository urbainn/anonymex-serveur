import { z } from "zod";

export enum TypeRecherche {
    UE = "UE",
    Salle = "Salle",
    Heure = "Heure",
    SalleHeure = "SalleHeure",
    Action = "Action",
    Etudiant = "Etudiant"
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

const RechercheSchema = z.object({
    type: z.enum(TypeRecherche)
});

export const RechercheUESchema = RechercheSchema.extend({
    type: z.literal(TypeRecherche.UE),
    ...CodeUEData
});

export const RechercheSalleSchema = RechercheSchema.extend({
    type: z.literal(TypeRecherche.Salle),
    ...SalleData
});

export const RechercheHeureSchema = RechercheSchema.extend({
    type: z.literal(TypeRecherche.Heure),
    ...HeureData
});

export const RechercheSalleHeureSchema = RechercheSalleSchema.extend({
    type: z.literal(TypeRecherche.SalleHeure),
    ...SalleData,
    ...HeureData
});

export const RechercheActionSchema = RechercheSchema.extend({
    type: z.literal(TypeRecherche.Action),
    ...ActionData
})

export const RechercheEtudiantSchema = RechercheSchema.extend({
    type: z.literal(TypeRecherche.Etudiant),
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
