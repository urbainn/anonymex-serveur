import { Etudiant } from "../etudiants/Etudiant";

export class ConvocationEpreuve {
    private etudiant: Etudiant;
    private codeAnonymat: string;
    private noteQuart: number | undefined;
    private idSalle: number;

    constructor(etudiant: Etudiant, codeAnonymat: string, idSalle: number, noteQuart?: number) {
        this.etudiant = etudiant;
        this.codeAnonymat = codeAnonymat;
        this.idSalle = idSalle;
        this.noteQuart = noteQuart;
    }

    public getEtudiant(): Etudiant {
        return this.etudiant;
    }

    public getCodeAnonymat(): string {
        return this.codeAnonymat;
    }

    public getNoteQuart(): number | undefined {
        return this.noteQuart;
    }

    public getIdSalle(): number {
        return this.idSalle;
    }
}
