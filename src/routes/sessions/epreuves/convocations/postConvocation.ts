import { sessionCache } from "../../../../cache/sessions/SessionCache";
import { etudiantCache } from "../../../../cache/etudiants/EtudiantCache";
import { Etudiant } from "../../../../cache/etudiants/Etudiant";
import { Convocation, ConvocationData } from "../../../../cache/epreuves/convocations/Convocation";
import { ErreurRequeteInvalide, ErreurServeur } from "../../../erreursApi";
import { config } from "../../../../config";
import { getDecalages, genererCodesHamming, classerCodes, appliquerDecalage } from "../../../../utils/codeAnonymatUtils";

export interface APINewConvocationResponse {
    success: boolean;
    convocation: any; // APIConvocation
}

export async function postConvocation(
    sessionId: string,
    epreuveCode: string,
    body: { numeroEtudiant?: unknown; nom?: unknown; prenom?: unknown; codeSalle?: unknown }
): Promise<APINewConvocationResponse> {
    const idSession = parseInt(sessionId ?? '', 10);
    const numeroEtudiant = parseInt(body.numeroEtudiant?.toString() ?? '', 10);
    const nom = body.nom?.toString();
    const prenom = body.prenom?.toString();
    const codeSalle = body.codeSalle?.toString();

    if (Number.isNaN(idSession)) {
        throw new ErreurRequeteInvalide("L'ID de la session est invalide.");
    }
    if (!epreuveCode) {
        throw new ErreurRequeteInvalide("Le code de l'epreuve est invalide.");
    }
    if (Number.isNaN(numeroEtudiant)) {
        throw new ErreurRequeteInvalide("Le numéro étudiant est invalide.");
    }
    if (!codeSalle) {
        throw new ErreurRequeteInvalide("Le code de la salle est obligatoire.");
    }

    const session = await sessionCache.getOrFetch(idSession);
    if (!session) {
        throw new ErreurRequeteInvalide("La session demandée n'existe pas.");
    }

    const epreuve = await session.epreuves.getOrFetch(epreuveCode);
    if (!epreuve) {
        throw new ErreurRequeteInvalide("L'épreuve demandée n'existe pas.");
    }

    // Récupérer les convocations existantes
    const convocations = await epreuve.convocations.getAll();

    // Vérifier si l'étudiant est déjà inscrit à cette épreuve
    const convocationExistante = convocations.find(c => c.numeroEtudiant === numeroEtudiant);
    if (convocationExistante) {
        throw new ErreurRequeteInvalide("Cet étudiant est déjà inscrit à cette épreuve.");
    }

    // Récupérer ou créer l'étudiant
    let etudiant = await etudiantCache.getOrFetch(numeroEtudiant);
    if (!etudiant) {
        if (!nom || !prenom) {
            throw new ErreurRequeteInvalide("L'étudiant n'existe pas en base de données. Le nom et le prénom sont requis.");
        }
        const dataEtudiant = {
            numero_etudiant: numeroEtudiant,
            nom: nom.trim(),
            prenom: prenom.trim()
        };
        etudiant = new Etudiant(dataEtudiant);
        await etudiantCache.insert(dataEtudiant, etudiant);
    }

    // Générer le code d'anonymat conforme
    const alphabet = config.codesAnonymat.alphabetCodeAnonymat;
    const maxCodesParEpreuve = Math.pow(alphabet.length, 3);
    const codes = {
        1: classerCodes(genererCodesHamming(maxCodesParEpreuve, 3, 1, alphabet)),
        2: classerCodes(genererCodesHamming(maxCodesParEpreuve, 3, 2, alphabet)),
        3: classerCodes(genererCodesHamming(maxCodesParEpreuve, 3, 3, alphabet)),
    };

    const nbConvocs = convocations.length;
    let distanceHamming = 1;
    if (nbConvocs < codes[3].codes.length) distanceHamming = 3;
    else if (nbConvocs < codes[2].codes.length) distanceHamming = 2;

    const codesDisponibles = codes[distanceHamming as 1 | 2 | 3];
    const existingBaseCodes = new Set(convocations.map(c => c.codeAnonymat.substring(0, 3)));

    let codeBase = "";
    for (const codeCandidat of codesDisponibles.codes) {
        if (!existingBaseCodes.has(codeCandidat)) {
            codeBase = codeCandidat;
            break;
        }
    }

    if (!codeBase) {
        throw new ErreurServeur("Plus de codes d'anonymat standard disponibles pour cette épreuve.");
    }

    const decalages = getDecalages(epreuve.idDecalage, alphabet);
    const codeAnonymat = codeBase + appliquerDecalage(codeBase, decalages, alphabet);

    // Créer la convocation
    const dataConvocation: ConvocationData = {
        id_session: idSession,
        code_epreuve: epreuveCode,
        numero_etudiant: numeroEtudiant,
        code_anonymat: codeAnonymat,
        note_quart: null,
        code_salle: codeSalle,
        rang: null
    };

    const convocation = epreuve.convocations.fromDatabase(dataConvocation);
    const insertResult = await epreuve.convocations.insert(dataConvocation, convocation);

    // Reconstruire le cache pour l'épreuve
    epreuve.convocations.reconstruireCache();

    const convocationFormatee = convocation.toJSON();
    convocationFormatee.nom = etudiant.nom;
    convocationFormatee.prenom = etudiant.prenom;

    return {
        success: insertResult.affectedRows > 0,
        convocation: convocationFormatee
    };
}
