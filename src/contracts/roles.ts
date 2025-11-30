import { literal, object, z } from "zod";

// --- Schémas ---
export const RoleSchema = z.object({
    idRole: z.number().int().positive(),
    nom : z.string(),
    permissions: z.number().int().positive()
});

export const ListRolesSchema = z.object({
    roles: z.array(RoleSchema)
});

// --- Types ---
export type APIRole = z.infer<typeof RoleSchema>;
export type APIListRoles = z.infer<typeof ListRolesSchema>;