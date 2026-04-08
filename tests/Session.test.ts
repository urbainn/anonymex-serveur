import { deleteSession } from "../src/routes/sessions/deleteSession";
import { sessionCache } from "../src/cache/sessions/SessionCache";
import { getSessions } from "../src/routes/sessions/getSessions";
import { patchSession } from "../src/routes/sessions/patchSession";
import { postSession } from "../src/routes/sessions/postSession";
import { Session } from "../src/cache/sessions/Session";
import { SessionsStatut } from "../src/contracts/sessions";
import { ErreurRequeteInvalide } from "../src/routes/erreursApi";
import { ZodError } from "zod";

jest.mock("../src/cache/sessions/SessionCache", () => ({
    sessionCache: {
        delete: jest.fn(),
        getAll: jest.fn(),
        getOrFetch: jest.fn(),
        update: jest.fn(),
        get: jest.fn(),
        insert: jest.fn(),
        set: jest.fn(),

    },
}));

// -- deleteSession --

describe('deleteSession', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Cas d\'erreurs', () => {
        it("doit retourner success: false si l'ID de session n'est pas valide (NaN).", async () => {

            (sessionCache.delete as jest.Mock).mockResolvedValue({ affectedRows: 0 });

            await expect(deleteSession('abc')).resolves.toEqual({ success: false });
            await expect(deleteSession('')).resolves.toEqual({ success: false });
        });
    });

    describe('Cas de succès', () => {
        it("doit retourner success: true si une ligne a été affectée.", async () => {
            (sessionCache.delete as jest.Mock).mockResolvedValue({ affectedRows: 1 });

            await expect(deleteSession('1')).resolves.toEqual({ success: true });
            expect(sessionCache.delete).toHaveBeenCalledWith(1);
        });

        it("doit retourner success: false si aucune ligne n'a été affectée.", async () => {
            (sessionCache.delete as jest.Mock).mockResolvedValue({ affectedRows: 0 });

            await expect(deleteSession('999')).resolves.toEqual({ success: false });
            expect(sessionCache.delete).toHaveBeenCalledWith(999);
        });
    });
});

// -- getSessions --

describe('getSessions', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Cas d\'erreurs', () => {
        it("doit lever une ErreurRequeteInvalide si la récupération des sessions échoue.", async () => {
            (sessionCache.getAll as jest.Mock).mockResolvedValue(undefined);

            await expect(getSessions()).rejects.toThrow(ErreurRequeteInvalide);
            await expect(getSessions()).rejects.toThrow("La liste des sessions n'a pas pu être renvoyée.");
        });
    });

    describe('Cas de succès', () => {
        it("doit retourner des valeurs par défaut si aucune session n'est en cache.", async () => {
            (sessionCache.getAll as jest.Mock).mockResolvedValue([]);

            await expect(getSessions()).resolves.toEqual({
                anneeMax: -Infinity,
                anneeMin: Infinity,
                sessions: []
            });
            expect(sessionCache.getAll).toHaveBeenCalled();
        });

        it('doit retourner la liste des sessions avec les années min et max calculées', async () => {
            const sessionsBrutes = [
                new Session({ id_session: 1, annee: 2025, nom: "Session Pair 1", statut: 0 }),
                new Session({ id_session: 2, annee: 2025, nom: "Session Impair 1", statut: 1 }),
                new Session({ id_session: 3, annee: 2026, nom: "Session Pair 2", statut: 2 })
            ];

            (sessionCache.getAll as jest.Mock).mockResolvedValue(sessionsBrutes);

            await expect(getSessions()).resolves.toEqual({
                anneeMax: 2026,
                anneeMin: 2025,
                sessions: [
                    { id: 1, annee: 2025, nom: "Session Pair 1", statut: 0 },
                    { id: 2, annee: 2025, nom: "Session Impair 1", statut: 1 },
                    { id: 3, annee: 2026, nom: "Session Pair 2", statut: 2 }
                ]
            });
            expect(sessionCache.getAll).toHaveBeenCalled();
        });
    });
});

// -- patchSession --

describe('patchSession', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Cas d\'erreurs', () => {
        it("doit lever une ErreurRequeteInvalide si l'ID de session n'est pas valide (undefined, non-nombre, vide).", async () => {

            await expect(patchSession('abc', {})).rejects.toThrow("L'ID de session n'est pas valide.");
            await expect(patchSession('', {})).rejects.toThrow("L'ID de session n'est pas valide.");
        });

        it("doit lever une ErreurRequeteInvalide si la session n'existe pas.", async () => {
            (sessionCache.getOrFetch as jest.Mock).mockResolvedValue(undefined);

            await expect(patchSession('1', { nom: "Session Pair 1" })).rejects.toThrow(ErreurRequeteInvalide);
            await expect(patchSession('1', { nom: "Session Pair 1" })).rejects.toThrow("La session passée n'existe pas.");
        });

        it("doit lever une erreur de validation (ZodError) si les données sont invalides.", async () => {
            (sessionCache.getOrFetch as jest.Mock).mockResolvedValue({ id: 1 });

            await expect(patchSession('1', { annee: "2026" })).rejects.toThrow(ZodError);
        });
    });

    describe('Cas de succès', () => {
        it("doit mettre à jour le cache et retourner les données parsées si tout est valide", async () => {
            const mockSession = { fromData: jest.fn() };
            const donneesUpdate = { nom: "Session Pair 2", annee: 2026 };

            (sessionCache.getOrFetch as jest.Mock).mockResolvedValue(mockSession);
            (sessionCache.get as jest.Mock).mockReturnValue(mockSession);
            (sessionCache.update as jest.Mock).mockResolvedValue({ affectedRows: 1 });

            await expect(patchSession('1', donneesUpdate)).resolves.toEqual(donneesUpdate);

            expect(sessionCache.update).toHaveBeenCalledWith(1, donneesUpdate);
        });
    });
});

// -- postSession --

describe('postSession', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Cas d\'erreurs', () => {
        it("doit lever une erreur de validation (ZodError) si les données sont invalides.", async () => {
            await expect(postSession({})).rejects.toThrow(ZodError);
            expect(sessionCache.insert).not.toHaveBeenCalled();
        });

        it("doit lever une ErreurRequeteInvalide si l'année est inférieure à l'année courante.", async () => {
            const anneePassee = new Date().getFullYear() - 1;
            const donnees = { nom: "Session Pair 1", annee: anneePassee };

            await expect(postSession(donnees)).rejects.toThrow(ErreurRequeteInvalide);
            await expect(postSession(donnees)).rejects.toThrow(`Erreur l'année ne peut pas être inférieure à ${anneePassee + 1}.`);

            expect(sessionCache.insert).not.toHaveBeenCalled();
        });
    });

    describe('Cas de succès', () => {
        it("doit insérer la session, la mettre en cache et retourner le format JSON", async () => {
            const anneeCourante = new Date().getFullYear();
            const donneesInput = { nom: "Session Pair 1", annee: anneeCourante };

            (sessionCache.insert as jest.Mock).mockResolvedValue({ insertId: 10, affectedRows: 1 });

            await expect(postSession(donneesInput)).resolves.toEqual({
                id: 10,
                nom: "Session Pair 1",
                annee: anneeCourante,
                statut: SessionsStatut.ACTIVE
            });

            expect(sessionCache.insert).toHaveBeenCalledWith({
                nom: "Session Pair 1",
                annee: anneeCourante,
                statut: SessionsStatut.ACTIVE
            });

            expect(sessionCache.set).toHaveBeenCalledWith(10, expect.any(Session));
        });
    });
});