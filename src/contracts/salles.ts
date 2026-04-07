import { z } from "zod";

// --- Schémas ---
export const SalleSchema = z.object({
    codeSalle: z.string(),
    libelleSalle: z.string(),
    codeBatiment: z.string(),
    libelleBatiment: z.string()
});

export const ListSallesSchema = z.object({
    salles: z.array(SalleSchema)
});

// --- Types ---
export type APISalle = z.infer<typeof SalleSchema>;
export type APIListSalles = z.infer<typeof ListSallesSchema>;