import { genererBordereau } from "./generation/bordereau/genererBordereau";
import { pdfToBuffer, pdfToCanvas_WIP } from "./lecture/preparation/conversion/pdfToBuffer";

genererBordereau({
    format: 'A4',
    longueurCodeAnonymat: 5,
    longueurCodeEpreuve: 2,
    version: 1,
});