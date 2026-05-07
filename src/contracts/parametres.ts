import { z } from "zod";

// --- Schémas ---
export const ParametresCharteGraphiqueSchema = z.object({
    logoUniversite: z.string().nullable(),
    logoFaculte: z.string().nullable(),
});

export const ParametresSauvegardeSchema = z.object({
    actif: z.boolean(),
    intervalleMinutes: z.number().int().positive(),
    chemin: z.string()
});

// --- Types ---
export type APIParametresCharteGraphique = z.infer<typeof ParametresCharteGraphiqueSchema>;
export type APIParametresSauvegarde = z.infer<typeof ParametresSauvegardeSchema>;