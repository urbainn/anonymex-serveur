import { lireBordereau } from "../src/core/lecture/lireBordereau";
import { readFileSync } from "fs";
import { extraireScans } from "../src/core/lecture/preparation/extraireScans";
import { ErreurDocumentSource } from "../src/core/lecture/lectureErreurs";

// TODO: à refaire correctement, introduire des fonctions
// testables dans les modules utilisés !!!

jest.mock('fs');

jest.mock('../src/core/lecture/preparation/extraireScans', () => ({
    extraireScans: jest.fn()
}));
jest.mock('../src/core/lecture/preparation/preparerScan', () => ({
    preparerScan: jest.fn()
}));
jest.mock('../src/core/lecture/preparation/decouperROIs', () => ({
    decouperROIs: jest.fn()
}));

jest.mock('../src/core/lecture/OCR/TesseractOCR', () => ({
    TesseractOCR: { configurerModeCaractereUnique: jest.fn(), interroger: jest.fn() }
}));
jest.mock('../src/core/lecture/CNN/TensorFlowCNN', () => ({
    TensorFlowCNN: { predire: jest.fn() }
}));

jest.mock('../src/core/lecture/preparation/detecterAprilTags', () => ({
    detecterAprilTags: jest.fn()
}));

jest.mock('../src/core/lecture/preparation/reorientation/orientationCiblesConcentriques', () => ({
    orientationCiblesConcentriques: jest.fn()
}));


describe('lireBordereau - Tests des erreurs', () => {
    const cheminTest = 'test.pdf';
    const mimeTest = 'application/pdf';
    beforeEach(() => {
        jest.clearAllMocks();

        (readFileSync as jest.Mock).mockReturnValue(Buffer.from('data')); // Mock du contenu du buffer (TODO : modifier en buffer 8bpp)
    })

    it('doit lever une erreur si readFileSync échoue', async () => {
        (readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error();
        })

        await expect(lireBordereau(cheminTest, mimeTest)).rejects.toThrow(Error);
    })

    describe('extraireScan - Tests des erreurs', () => {
        it('doit lever une ErreurDocumentSource si le type MIME n\'est pas supporté par extraireScans', async () => {
            const mimeInconnu = 'application/docx' as 'application/pdf'; // Force un type non supporté (docx) pour la levée de ErreurDocumentSource

            (extraireScans as jest.Mock).mockImplementation(() => {
                throw new ErreurDocumentSource(`Type de document source non supporté : ${mimeInconnu}`);
            })

            await expect(lireBordereau(cheminTest, mimeInconnu)).rejects.toThrow(ErreurDocumentSource);
        })

        it('doit lever une erreur si getDocument échoue', async () => {
            (extraireScans as jest.Mock).mockImplementation(() => {
                throw new Error("PDF invalide ou corrompu"); // Simule la corruption ou l'invalidité d'un PDF chargé par getDocument
            })

            // Jest ne parvient pas à gérer l'import des modules mjs (TODO : essayer d'adapter jest.config.js)
            // expect(getDocument()).toHaveBeenCalled();

            await expect(lireBordereau(cheminTest, mimeTest)).rejects.toThrow(Error("PDF invalide ou corrompu"));
        })
    })

    // TODO : Vérifier la détection des ErreurDetectionAprilTags en simulant le succès de extraireScans puis en appelant preparerScan avec orientationDeg = -1
})