import { ErreurBase } from "../../core/ErreurBase";

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

// Erreurs de lecture des cibles concentriques
export class ErreurDetectionCiblesConcentriques extends ErreurLecture { }

// Erreurs de realignement/correction du scan
export class ErreurRealignement extends ErreurLecture { }

// Erreurs de ROI
export class ErreurLectureROIs extends ErreurLecture { }
export class ErreurDecoupeROIs extends ErreurLecture { }

// Erreurs de reconnaissance
export class ErreurReconnaissance extends ErreurLecture { }
export class ErreurOCR extends ErreurReconnaissance { }
export class ErreurCNN extends ErreurReconnaissance { }

// Erreurs de résultat lu
export class ErreurResultatLu extends ErreurLecture {
    public codeAnonymatLu?: string;
    public noteLue?: number;
    
    constructor(message: string, codeAnonymatLu?: string, noteLue?: number) {
        super(message);
        this.codeAnonymatLu = codeAnonymatLu;
        this.noteLue = noteLue;
    }
}

export class ErreurCodeAnonymat extends ErreurResultatLu {}