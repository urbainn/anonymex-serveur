import { deleteConvocations } from "../src/routes/sessions/epreuves/convocations/deleteConvocations";
import { getConvocations } from "../src/routes/sessions/epreuves/convocations/getConvocations";
import { getConvocationsSupplementaires } from "../src/routes/sessions/epreuves/convocations/getConvocationsSupplementaires";
import { patchConvocation } from "../src/routes/sessions/epreuves/convocations/patchConvocation";
import { etudiantCache } from "../src/cache/etudiants/EtudiantCache";
import { sessionCache } from "../src/cache/sessions/SessionCache";
import { ErreurRequeteInvalide, ErreurServeur } from "../src/routes/erreursApi";

jest.mock("../src/cache/sessions/SessionCache", () => ({
    sessionCache: {
        getOrFetch: jest.fn(),
    },
}));

jest.mock("../src/cache/etudiants/EtudiantCache", () => ({
    etudiantCache: {
        getAll: jest.fn(),
        getOrFetch: jest.fn(),
    },
}));

// -- deleteConvocations --

describe('deleteConvocations', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Cas d\'erreurs', () => {
        it("doit lever une ErreurRequeteInvalide si l'array de codes anonymats est invalide (undefined).", async () => {
            await expect(deleteConvocations('1', 'HAI604I', undefined)).rejects.toThrow("L'array de codes anonymats est invalide.");
        });

        it("doit lever une ErreurRequeteInvalide si le paramètre n'est pas un array.", async () => {
            await expect(deleteConvocations('1', 'HAI604I', 'pas-un-array')).rejects.toThrow("Le paramètre doit être un array de codes anonymats");
        });

        it("doit lever une ErreurRequeteInvalide si l'ID de session n'est pas valide.", async () => {
            await expect(deleteConvocations('abc', 'HAI604I', [])).rejects.toThrow("L'ID de la session est invalide.");
        });

        it("doit lever une ErreurRequeteInvalide si le code de l'épreuve est invalide.", async () => {
            await expect(deleteConvocations('1', '', [])).rejects.toThrow("Le code de l'epreuve est invalide.");
        });

        it("doit lever une ErreurRequeteInvalide si la session n'existe pas.", async () => {
            (sessionCache.getOrFetch as jest.Mock).mockResolvedValue(undefined);
            await expect(deleteConvocations('1', 'HAI604I', [])).rejects.toThrow("La session demandé n'existe pas.");
        });

        it("doit lever une ErreurRequeteInvalide si l'épreuve n'existe pas.", async () => {
            const mockSession = { epreuves: { getOrFetch: jest.fn().mockResolvedValue(undefined) } };
            (sessionCache.getOrFetch as jest.Mock).mockResolvedValue(mockSession);
            await expect(deleteConvocations('1', 'INCONNUE', [])).rejects.toThrow("L'épreuve demandé n'existe pas.");
        });
    });

    describe('Cas de succès', () => {
        it("doit retourner success: true si au moins une ligne est affectée", async () => {
            const mockEpreuve = { convocations: { delete: jest.fn().mockResolvedValue({ affectedRows: 1 }) } };
            const mockSession = { epreuves: { getOrFetch: jest.fn().mockResolvedValue(mockEpreuve) } };
            (sessionCache.getOrFetch as jest.Mock).mockResolvedValue(mockSession);

            const result = await deleteConvocations('1', 'HAI604I', ['BCCNIZ']);
            expect(result).toEqual({ success: true });
            expect(mockEpreuve.convocations.delete).toHaveBeenCalledWith('BCCNIZ');
        });
    });
});

// -- getConvocations --

describe('getConvocations', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Cas d\'erreurs', () => {
        it("doit lever une ErreurRequeteInvalide si l'ID de session n'est pas valide.", async () => {
            await expect(getConvocations('abc', 'HAI604I')).rejects.toThrow("L'ID de la session est invalide.");
        });

        it("doit lever une ErreurRequeteInvalide si la session n'existe pas.", async () => {
            (sessionCache.getOrFetch as jest.Mock).mockResolvedValue(undefined);
            await expect(getConvocations('1', 'HAI604I')).rejects.toThrow("La session demandé n'existe pas.");
        });
    });

    describe('Cas de succès', () => {
        it("doit retourner la liste des convocations enrichie avec les données étudiants", async () => {
            const mockConvocation = {
                toJSON: jest.fn().mockReturnValue({ numeroEtudiant: 21657957, codeAnonymat: "BCCNIZ" })
            };
            const mockEpreuve = { convocations: { getAll: jest.fn().mockResolvedValue([mockConvocation]) } };
            const mockSession = { epreuves: { getOrFetch: jest.fn().mockResolvedValue(mockEpreuve) } };
            const mockEtudiant = { nom: "Dupont", prenom: "Jean" };

            (sessionCache.getOrFetch as jest.Mock).mockResolvedValue(mockSession);
            (etudiantCache.getOrFetch as jest.Mock).mockResolvedValue(mockEtudiant);

            const result = await getConvocations('1', 'HAI604I');

            expect(result).toEqual({
                convocations: [{
                    numeroEtudiant: 21657957,
                    codeAnonymat: "BCCNIZ",
                    nom: "Dupont",
                    prenom: "Jean"
                }]
            });
            expect(etudiantCache.getAll).toHaveBeenCalled();
            expect(etudiantCache.getOrFetch).toHaveBeenCalledWith(21657957);
        });
    });
});

// -- getConvocationsSupplementaires --

describe('getConvocationsSupplementaires', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Cas d\'erreurs', () => {
        it("doit lever une ErreurRequeteInvalide si l'ID de session n'est pas valide.", async () => {
            await expect(getConvocationsSupplementaires('abc', 'HAI604I')).rejects.toThrow("L'ID de la session est invalide.");
        });

        it("doit lever une ErreurRequeteInvalide si le code de l'épreuve est invalide.", async () => {
            await expect(getConvocationsSupplementaires('1', '')).rejects.toThrow("Le code de l'epreuve est invalide.");
        });

        it("doit lever une ErreurRequeteInvalide si la session n'existe pas.", async () => {
            (sessionCache.getOrFetch as jest.Mock).mockResolvedValue(undefined);
            await expect(getConvocationsSupplementaires('1', 'HAI604I')).rejects.toThrow("La session demandé n'existe pas.");
        });

        it("doit lever une ErreurRequeteInvalide si l'épreuve n'existe pas.", async () => {
            const mockSession = { epreuves: { getOrFetch: jest.fn().mockResolvedValue(undefined) } };
            (sessionCache.getOrFetch as jest.Mock).mockResolvedValue(mockSession);
            await expect(getConvocationsSupplementaires('1', 'INCONNUE')).rejects.toThrow("L'épreuve demandé n'existe pas.");
        });
    });

    describe('Cas de succès', () => {
        it("doit retourner un objet groupé par codeSalle avec les convocations formatées", async () => {
            const mockConvocation = {
                codeSalle: "SC.36.4",
                toJSON: jest.fn().mockReturnValue({ codeAnonymat: "ZBZLHX", codeSalle: "SC.36.4" })
            };

            const mockEpreuve = {
                convocations: {
                    getAll: jest.fn().mockResolvedValue([]),
                    convocationsSupplementaires: new Map([["ZBZLHX", mockConvocation]])
                }
            };

            const mockSession = { epreuves: { getOrFetch: jest.fn().mockResolvedValue(mockEpreuve) } };
            (sessionCache.getOrFetch as jest.Mock).mockResolvedValue(mockSession);

            const result = await getConvocationsSupplementaires('1', 'HAI604I');

            expect(result).toEqual({
                "SC.36.4": [{ codeAnonymat: "ZBZLHX", codeSalle: "SC.36.4" }]
            });
            expect(mockEpreuve.convocations.getAll).toHaveBeenCalled();
        });

        it("doit retourner un objet vide si aucune convocation supplémentaire n'est présente", async () => {
            const mockEpreuve = {
                convocations: {
                    getAll: jest.fn().mockResolvedValue([]),
                    convocationsSupplementaires: new Map()
                }
            };

            const mockSession = { epreuves: { getOrFetch: jest.fn().mockResolvedValue(mockEpreuve) } };
            (sessionCache.getOrFetch as jest.Mock).mockResolvedValue(mockSession);

            const result = await getConvocationsSupplementaires('1', 'HAI604I');

            expect(result).toEqual({});
        });
    });
});

describe('patchConvocation', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Cas d\'erreurs', () => {
        it("doit lever une ErreurServeur si le code anonymat commence par 'Z'.", async () => {
            await expect(patchConvocation('1', 'HAI604I', 'ZBZLHX', {})).rejects.toThrow(ErreurServeur);
            await expect(patchConvocation('1', 'HAI604I', 'ZBZLHX', {})).rejects.toThrow("Vous ne pouvez pas modifier ce code anonymat.");
        });

        it("doit lever une ErreurRequeteInvalide si l'ID de session n'est pas valide.", async () => {
            await expect(patchConvocation('abc', 'HAI604I', 'BCCNIZ', {})).rejects.toThrow("L'ID de la session est invalide.");
        });

        it("doit lever une ErreurRequeteInvalide si la session n'existe pas.", async () => {
            (sessionCache.getOrFetch as jest.Mock).mockResolvedValue(undefined);
            await expect(patchConvocation('1', 'HAI604I', 'BCCNIZ', {})).rejects.toThrow("La session demandé n'existe pas.");
        });

        it("doit lever une erreur de validation si les données ne respectent pas le schéma (ex: rang négatif).", async () => {
            const mockEpreuve = { convocations: { update: jest.fn() } };
            const mockSession = { epreuves: { getOrFetch: jest.fn().mockResolvedValue(mockEpreuve) } };
            (sessionCache.getOrFetch as jest.Mock).mockResolvedValue(mockSession);

            await expect(patchConvocation('1', 'HAI604I', 'BCCNIZ', { rang: -5 })).rejects.toThrow();
        });
    });

    describe('Cas de succès', () => {
        it("doit mettre à jour la convocation et retourner les données si tout est valide", async () => {
            const donneesUpdate = { rang: 10, code_salle: "SC.36.4", note_quart: 65 };
            const mockEpreuve = { 
                convocations: { 
                    update: jest.fn().mockResolvedValue(undefined) 
                } 
            };
            const mockSession = { epreuves: { getOrFetch: jest.fn().mockResolvedValue(mockEpreuve) } };
            (sessionCache.getOrFetch as jest.Mock).mockResolvedValue(mockSession);

            const result = await patchConvocation('1', 'HAI604I', 'BCCNIZ', donneesUpdate);

            expect(result).toEqual(donneesUpdate);
            expect(mockEpreuve.convocations.update).toHaveBeenCalledWith('BCCNIZ', donneesUpdate);
        });
    });
});