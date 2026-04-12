import { etudiantCache } from "../../../../cache/etudiants/EtudiantCache";
import { sessionCache } from "../../../../cache/sessions/SessionCache";
import { APIConvocation, APIListeConvocations } from "../../../../contracts/convocations";
import { ErreurRequeteInvalide } from "../../../erreursApi";

export async function getConvocations(sessionId: string, epreuveCode: string): Promise<APIListeConvocations> {

    const idSession = parseInt(sessionId ?? '');

    if (isNaN(idSession) || sessionId === undefined) {
        throw new ErreurRequeteInvalide("L'ID de la session est invalide.");
    }

    if (!epreuveCode) {
        throw new ErreurRequeteInvalide("Le code de l'epreuve est invalide.");
    }

    const session = await sessionCache.getOrFetch(idSession);
    if (!session) {
        throw new ErreurRequeteInvalide("La session demandée n'existe pas.");
    }

    const epreuve = await session.epreuves.getOrFetch(epreuveCode);
    if (!epreuve) {
        throw new ErreurRequeteInvalide("L'épreuve demandée n'existe pas.");
    }

    const convocationsBrutes = await epreuve.convocations.getAll();
    const tousLesEtudiants = await etudiantCache.getAll();

    const etudiantsMap = new Map(tousLesEtudiants.map(e => [e.numeroEtudiant, e]));

    const listeConvocations: APIConvocation[] = [];
    
    for (const convocation of convocationsBrutes) {
        const convocationFormatee = convocation.toJSON();
        
        if (convocationFormatee.numeroEtudiant !== undefined) {
            const etudiant = etudiantsMap.get(convocationFormatee.numeroEtudiant);
            convocationFormatee.prenom = etudiant?.prenom;
            convocationFormatee.nom = etudiant?.nom;
        }
        
        listeConvocations.push(convocationFormatee);
    }

    return { convocations: listeConvocations };
}