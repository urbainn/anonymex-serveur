import { z } from "zod";

// --- Schémas ---
export const EtudiantSchema = z.object({
    numeroEtudiant: z.number().int().positive(),
    nom: z.string(),
    prenom: z.string()
});

export const NewEtudiantSchema = EtudiantSchema;

export const UpdateEtudiantSchema = EtudiantSchema.pick({ nom: true, prenom: true }).partial();

// --- Types ---
export type APIEtudiant = z.infer<typeof EtudiantSchema>;
export type APINewEtudiant = z.infer<typeof NewEtudiantSchema>;
export type APIUpdateEtudiant = z.infer<typeof UpdateEtudiantSchema>;