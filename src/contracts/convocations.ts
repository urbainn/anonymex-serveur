import { z } from "zod";

// --- Schémas ---
export const ConvocationSchema = z.object({
    idSession: z.number().int().positive(),
    codeEpreuve: z.string(),
    numeroEtudiant: z.int().positive().optional(),
    rang: z.number().int().positive().optional(),
    codeAnonymat: z.string(),
    noteQuart: z.number().int().positive().optional(),
    codeSalle: z.string()
});

export const ListConvocationsSchema = z.object({
    convocations: z.array(ConvocationSchema)
});

export const UpdateConvocationSchema = ConvocationSchema.pick({ rang: true, noteQuart: true, codeSalle: true });

// --- Types ---
export type APIConvocation = z.infer<typeof ConvocationSchema>;
export type APIUpdateConvocation = z.infer<typeof UpdateConvocationSchema>;
export type APIListeConvocations = z.infer<typeof ListConvocationsSchema>;