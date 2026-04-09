import { ErreurBase } from "../../core/ErreurBase";

abstract class ErreurLecture extends ErreurBase { abstract name: string; abstract incident: boolean; }

// Erreurs de document source
export class ErreurDocumentSource extends ErreurLecture { name = "Document invalide/corrompu"; incident = false; }

// Erreurs de conversion
export class ErreurConversion extends ErreurLecture { name = "Document non convertible"; incident = false; }
export class ErreurPdfIncompatible extends ErreurConversion { name = "PDF non compatible"; incident = false; }

// Erreurs d'alignement/correction
export class ErreurAlignement extends ErreurLecture { name = "Alignement impossible"; incident = false; }

// Erreurs de lecture des April Tags
export class ErreurDetectionAprilTags extends ErreurLecture { name = "Erreur de lecture"; incident = true; }

// Erreurs de lecture des cibles concentriques
export class ErreurDetectionCiblesConcentriques extends ErreurLecture { name = "Erreur de lecture"; incident = true; }

// Erreurs de realignement/correction du scan
export class ErreurRealignement extends ErreurLecture { name = "Erreur de correction du scan"; incident = true; }

// Erreurs de ROI
export class ErreurLectureROIs extends ErreurLecture { name = "Erreur de lecture des ROIs"; incident = true; }
export class ErreurDecoupeROIs extends ErreurLecture { name = "Erreur de découpe des ROIs"; incident = true; }

// Erreurs de reconnaissance
export abstract class ErreurReconnaissance extends ErreurLecture { }
export class ErreurCNN extends ErreurReconnaissance { name = "ErreurCNN"; incident = true; }

// Erreurs de résultat lu
export class ErreurResultatLu extends ErreurLecture {
    public codeAnonymatLu?: string;
    public noteLue?: number;

    name = "Copie non reconnue";
    incident = true;

    constructor(message: string, codeAnonymatLu?: string, noteLue?: number) {
        super(message);
        this.codeAnonymatLu = codeAnonymatLu;
        this.noteLue = noteLue;
    }
}

export class ErreurCodeAnonymat extends ErreurResultatLu { }

// Erreurs lecture de la grille de notes
export class ErreurLectureGrilleNote extends ErreurLecture { name = "Erreur de lecture de la note"; incident = true; }
export class ErreurNoteNonLue extends ErreurLectureGrilleNote { name = "Aucune note lue"; }
export class ErreurNoteAmbigue extends ErreurLectureGrilleNote { name = "Lecture de note ambiguë"; }
export class ErreurNoteInvalide extends ErreurLectureGrilleNote { name = "Note lue invalide"; }
export class ErreurNoteCaseErreur extends ErreurLectureGrilleNote { name = "Case 'erreur' cochée"; }