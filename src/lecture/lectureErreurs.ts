import { ErreurBase } from "../core/ErreurBase";

abstract class ErreurLecture extends ErreurBase { }

// Erreurs de document source
export class ErreurDocumentSource extends ErreurLecture { }

// Erreurs de conversion
export class ErreurConversion extends ErreurLecture { }
export class ErreurPdfIncompatible extends ErreurConversion { }