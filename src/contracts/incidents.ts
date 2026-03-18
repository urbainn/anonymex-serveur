import { z } from "zod";

// --- Schémas ---
export const IncidentSchema = z.object({
    idIncident: z.number().int().positive(),
    idSession: z.number().int().positive(),
    codeEpreuve: z.string(),
    titre: z.string(),
    details: z.string(), 
    codeAnonymat: z.string().optional(),
    noteQuart: z.number().int().positive().optional(),
});

export const ListIncidentsSchema = z.object({
    incidents: z.array(IncidentSchema.pick({ idIncident: true, titre: true, details: true, resolu: true }))
});

export const PartielIncidentSchema = IncidentSchema.pick({ idIncident:true, codeAnonymat: true, noteQuart: true });

// --- Types ---
export type APIIncident = z.infer<typeof IncidentSchema>;
export type APIListIncidents = z.infer<typeof ListIncidentsSchema>;
export type APIPartielIncident = z.infer<typeof PartielIncidentSchema>;

