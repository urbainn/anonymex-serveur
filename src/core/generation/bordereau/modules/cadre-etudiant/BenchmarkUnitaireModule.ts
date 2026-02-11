import { LayoutPosition } from "../../../ModeleLectureBase";
import { CadreEtudiantModule } from "../ModulesBordereau";

export class BenchmarkUnitaireModule extends CadreEtudiantModule {

    private alphabet: string;

    constructor(alphabet: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        super();
        this.alphabet = alphabet;
    }

    getNom(): string {
        return "Module de test/benchmark (UNITAIRE)";
    }

    getFormat(): "A4" | "A5" {
        return "A4";
    }

    getZonesLecture(): { lettresCodeAnonymat: LayoutPosition[]; lettresCodeEpreuve: LayoutPosition[]; } {
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

        const layout = this.getZonesLecture();

        // Dessiner les cadres pour chaque lettre du code d'anonymat
        for (const position of layout.lettresCodeAnonymat) {
            //this.dessinerCadreLettre(pdf, position);
        }

        // Dessiner les instructions (centré)
        pdf.fontSize(15).fillColor('black').text('Reporter le code donné dans les cases correspondantes. ', 0, 100, { align: 'center' });


        // WIP: + consignes
        // - ne pas dépasser
        // - en majuscule
        // - en noir ou bleu

        // Dessiner code
        const code = "ABC DEF";
        pdf.font('Helvetica-Bold').fontSize(26).fillColor('black').text(code, 0, 130, { align: 'center' });

        return true;
    }

    dessinerCadreLettre(pdf: PDFKit.PDFDocument, position: LayoutPosition): void {
        pdf.rect(position.x, position.y, position.largeur, position.hauteur)
            .lineWidth(0.5)
            .strokeColor('black')
            .stroke()

    }

}