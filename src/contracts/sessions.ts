import { z } from "zod";

export enum SessionsStatut {
    ACTIVE = 1,
    TERMINEE = 2,
    ARCHIVEE = 3,
    EN_SUPPRESSION = 4
}

// --- Schémas ---
export const SessionSchema = z.object({
    id: z.number().int().positive(),
    nom: z.string(),
    annee: z.number().int().min(2025),
    statut: z.enum(SessionsStatut)
});

export const NewSessionSchema = SessionSchema.omit({ id: true, statut: true });

export const UpdateSessionSchema = NewSessionSchema.partial();

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