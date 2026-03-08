import { ErreurBase } from "../ErreurBase";

export class ErreurXLSX extends ErreurBase { };
export class ErreurLectureXLSX extends ErreurXLSX { };
export class ErreurInterpretationXLSX extends ErreurXLSX { }

export class ErreurLigneInvalide extends ErreurInterpretationXLSX {
    constructor(ligne: number, message?: string) {
        super(`Ligne ${ligne} invalide ou incomplète${message ? ` : ${message}` : ""}.`);
    }
}