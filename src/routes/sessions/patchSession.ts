import { sessionCache } from "../../cache/sessions/SessionCache";
import { APIUpdateSession, UpdateSessionSchema } from "../../contracts/sessions";
import { ErreurRequeteInvalide } from "../erreursApi";

export async function patchSession(id: string, data: Record<string, unknown>): Promise<APIUpdateSession> {
    const idSession = parseInt(id ?? '');

    if (isNaN(idSession) || id === undefined)
        throw new ErreurRequeteInvalide("L'ID de session n'est pas valide.");

    const session = await sessionCache.getOrFetch(idSession);
    if (!session) throw new ErreurRequeteInvalide("La session passée n'existe pas.");

    const dataParsees = UpdateSessionSchema.parse(data);
    await sessionCache.update(idSession, dataParsees);

    // Patcher les données
    if (dataParsees.nom !== undefined) session.nom = dataParsees.nom;
    if (dataParsees.annee !== undefined) session.annee = dataParsees.annee;
    if (dataParsees.statut !== undefined) session.statut = dataParsees.statut;

    return dataParsees;
}