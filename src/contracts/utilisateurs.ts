import { z } from "zod";

// --- Schémas ---
export const UtilisateurSchema = z.object({
    id: z.number().int().positive(),
    email: z.email(),
    nom: z.string(),
    prenom: z.string(),
    idRole: z.number().int().positive()
});

export const ListUtilisateursSchema = z.object({
    utilisateurs: z.array(UtilisateurSchema)
});

export const LoginUtilisateurSchema = UtilisateurSchema.pick({ email: true }).extend({ motDePasse: z.string() });

export const UpdateUtilisateurSchema = UtilisateurSchema.omit({ id: true, idRole: true }).partial();

export const GetAuthInfoSchema = z.object({ premiereConnexion: z.boolean() });

// --- Types ---
export type APIUtilisateur = z.infer<typeof UtilisateurSchema>;
export type APIListUtilisateur = z.infer<typeof ListUtilisateursSchema>;
export type APILoginBody = z.infer<typeof LoginUtilisateurSchema>;
export type APIUpdateUtilisateur = z.infer<typeof UpdateUtilisateurSchema>;
export type APIGetAuthInfo = z.infer<typeof GetAuthInfoSchema>;