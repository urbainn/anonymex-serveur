import { ErreurBase } from "../core/ErreurBase";

abstract class ErreurLecture extends ErreurBase { }

// Erreurs de conversion
export class ErreurConversion extends ErreurLecture { }
export class ErreurPdfIncompatible extends ErreurConversion { }