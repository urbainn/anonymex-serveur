import { ErreurBase } from "../core/ErreurBase";

abstract class ErreurLecture extends ErreurBase { }

// Erreurs de document source
export class ErreurDocumentSource extends ErreurLecture { }

// Erreurs de conversion
export class ErreurConversion extends ErreurLecture { }
export class ErreurPdfIncompatible extends ErreurConversion { }

// Erreurs d'alignement/correction
export class ErreurAlignement extends ErreurLecture { }

// Erreurs de lecture des April Tags
export class ErreurDetectionAprilTags extends ErreurLecture { }