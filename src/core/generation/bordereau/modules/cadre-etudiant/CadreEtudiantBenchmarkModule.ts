import { CadreEtudiantModule, LayoutPosition } from "../ModulesBordereau";

export class CadreEtudiantBenchmarkModule extends CadreEtudiantModule {

    private alphabet: string;

    constructor(alphabet: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        super();
        this.alphabet = alphabet;
    }

    getNom(): string {
        return "Module de test/benchmark OCR";
    }

    getFormat(): "A4" | "A5" {
        return "A4";
    }

    getLayoutPositions(): { lettresCodeAnonymat: LayoutPosition[]; lettresCodeEpreuve: LayoutPosition[]; } {
        // 10 cases par lettre de l'alphabet
        const lettresCode = new Array<LayoutPosition>(this.alphabet.length * 10);

        for (let i = 0; i < this.alphabet.length; i++) {
            const colonneX = 40 + (i % 2) * 267; // position x de la colonne
            const ligneY = 90 + Math.floor(i / 2) * 53; // position y de la ligne

            for (let j = 0; j < 10; j++) {
                lettresCode[i * 10 + j] = {
                    x: j * 25 + colonneX,
                    y: ligneY,
                    largeur: 22,
                    hauteur: 26
                };
            }
        }

        return {
            lettresCodeAnonymat: lettresCode,
            lettresCodeEpreuve: []
        };
    }

    generer(pdf: PDFKit.PDFDocument): boolean {

        const layout = this.getLayoutPositions();

        // Dessiner les cadres pour chaque lettre du code d'anonymat
        for (const position of layout.lettresCodeAnonymat) {
            this.dessinerCadreLettre(pdf, position);
        }

        // Dessiner les lettres (guidage visuel)
        pdf.fontSize(15).fillColor('black');
        const abc = this.alphabet;

        for (let i = 0; i < abc.length; i++) {
            // Lettres dans l'ordre vertical (une colonne à gauche, une colonne à droite)
            const lettre = abc[(i % 2 * Math.ceil(abc.length / 2)) + Math.floor(i / 2)]!;
            const position = layout.lettresCodeAnonymat[i * 10];
            if (position) pdf.text(lettre, position.x + 5, position.y - 15);
        }

        return true;
    }

    dessinerCadreLettre(pdf: PDFKit.PDFDocument, position: LayoutPosition): void {
        pdf.rect(position.x, position.y, position.largeur, position.hauteur)
            .lineWidth(0.5)
            .strokeColor('black')
            .stroke()

    }

}