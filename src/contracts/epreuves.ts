import { z } from "zod";

export enum EpreuveStatut {
    MATERIEL_NON_IMPRIME = 1,
    MATERIEL_IMPRIME = 2,
    EN_ATTENTE_DE_DEPOT = 3,
    DEPOT_COMPLET = 4,
    NOTE_EXPORTEES = 5
}

export const EpreuveStatutNom: Record<EpreuveStatut, string> = {
    1: "Matériel non imprimé",
    2: "Matériel imprimé",
    3: "En attente de dépôt",
    4: "Dépôt complet",
    5: "Notes exportées"
};

// --- Schémas ---
export const EpreuveSchema = z.object({
    session: z.number().int().positive(),
    code: z.string(),
    nom: z.string(),
    statut: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    salles: z.array(z.string()),
    date: z.date(),
    duree: z.number().int().positive(), // durée en minutes
    copies: z.number().int().nonnegative().optional(), // nombre de copies déposées
    copiesTotal: z.number().int().positive().optional(), // nombre total de copies attendues
    incidents: z.number().int().nonnegative().optional() // nombre d'incidents de lecture
});

export const ListEpreuvesSchema = z.object({
    epreuves: z.array(EpreuveSchema)
});

export const UpdateEpreuveSchema = EpreuveSchema.pick({ nom: true, salles: true, date: true, duree: true }).partial();

// --- Types ---
export type APIEpreuve = z.infer<typeof EpreuveSchema>;
export type APIUpdateEpreuve = z.infer<typeof UpdateEpreuveSchema>;
export type APIListEpreuves = z.infer<typeof ListEpreuvesSchema>;
