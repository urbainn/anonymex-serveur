import { z } from "zod";

export enum SessionsStatut {
    ACTIVE = 0,
    TERMINEE = 1,
    ARCHIVEE = 2,
    EN_SUPPRESSION = 3
}

// --- Schémas ---
export const SessionSchema = z.object({
    id: z.number().int().positive(),
    nom: z.string(),
    annee: z.number().int().min(2025),
    statut: z.enum(SessionsStatut)
});

export const NewSessionSchema = SessionSchema.omit({ id: true, statut: true });

export const UpdateSessionSchema = SessionSchema.partial();

export const ListSessionsSchema = z.object({
    anneeMax: z.number().int(),
    anneeMin: z.number().int(),
    sessions: z.array(SessionSchema)
});

// --- Types ---
export type APISession = z.infer<typeof SessionSchema>;
export type APINewSession = z.infer<typeof NewSessionSchema>;
export type APIUpdateSession = z.infer<typeof UpdateSessionSchema>;
export type APIListSessions = z.infer<typeof ListSessionsSchema>;