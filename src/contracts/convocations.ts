import { z } from "zod";

// --- Schémas ---
export const ConvocationSchema = z.object({
    idSession: z.number().int().positive(),
    codeEpreuve: z.string(),
    numeroEtudiant: z.number().int().positive().optional(),
    rang: z.number().int().positive().optional(),
    codeAnonymat: z.string(),
    noteQuart: z.number().int().positive().optional(),
    codeSalle: z.string(),
    prenom: z.string().optional(),
    nom: z.string().optional()
});

export const ListConvocationsSchema = z.object({
    convocations: z.array(ConvocationSchema)
});

export const ConvocationsSupplementairesMapSchema = z.record(z.string(), z.array(ConvocationSchema));

export const UpdateConvocationSchema = z.object({
    rang: z.number().int().positive().optional(),
    note_quart: z.number().int().positive().optional(),
    code_salle: z.string().optional()
});

// --- Types ---
export type APIConvocation = z.infer<typeof ConvocationSchema>;
export type APIUpdateConvocation = z.infer<typeof UpdateConvocationSchema>;
export type APIListeConvocations = z.infer<typeof ListConvocationsSchema>;
export type APIConvocationsSupplementairesMap = z.infer<typeof ConvocationsSupplementairesMapSchema>;