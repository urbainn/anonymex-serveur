/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Calcule la distance de Hamming entre deux chaînes de même longueur
 * @param a
 * @param b
 */
export function hamming(a: string, b: string): number {
    if (a.length !== b.length) throw new Error("Les chaînes doivent avoir la même longueur.");
    let dist = 0;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) dist++;
    }
    return dist;
}

/**
 * Génère le mot correspondant à un index (base Q = taille de l'alphabet)
 * @param index indice du mot dans l'espace de codes
 * @param length longueur du mot
 * @param alphabet
 */
export function indiceVersMot(index: number, length: number, alphabet: string): string {
    let word = "";
    const Q = alphabet.length;
    for (let i = 0; i < length; i++) {
        word = alphabet[index % Q] + word;
        index = Math.floor(index / Q);
    }
    return word;
}

/**
 * Génère les n premiers codes avec distance minimale donnée.
 * @param n nombre de codes à générer
 * @param taille nb. de caractères dans les codes
 * @param minDistance distance minimale entre les codes
 * @param alphabet alphabet utilisé pour générer les codes
 */
export function genererCodesHamming(
    n: number,
    taille: number,
    minDistance: number,
    alphabet: string
): string[] {
    const results: string[] = [];
    const max = Math.pow(alphabet.length, taille);

    for (let i = 0; i < max && results.length < n; i++) {
        const candidat = indiceVersMot(i, taille, alphabet);

        let valid = true;
        for (const existing of results) {
            if (hamming(candidat, existing) < minDistance) {
                valid = false;
                break;
            }
        }

        if (valid) results.push(candidat);
    }

    return results;
}

/**
 * Appliquer un décalage à un code d'anonymat, afin d'obtenir le code de redondance systématique.
 * @param codeAnonymat code d'anonymat effectif
 * @param decalage valeur de décalage (base alphabetique)
 * @param alphabet 
 */
export function appliquerDecalage(codeAnonymat: string, decalages: number[], alphabet: string): string {
    let codeRedondance = "";
    const Q = alphabet.length;
    for (let i = 0; i < codeAnonymat.length; i++) {
        const indexLettre = alphabet.indexOf(codeAnonymat[i]!); // lookup table plus efficace?
        if (indexLettre === -1) throw new Error(`Caractère '${codeAnonymat[i]}' non trouvé dans l'alphabet.`);
        const indexDecale = (indexLettre + decalages[i]!) % Q;
        codeRedondance += alphabet[indexDecale];
    }
    return codeRedondance;
}

/**
 * Mélange et classe les codes (ceux qui commencent par Z sont séparés)
 */
export function classerCodes(codes: string[]): { codes: string[], reserve: string[] } {
    const plageSpeciale: string[] = [];
    const plageStandard: string[] = [];

    for (let i = codes.length - 1; i > 0; i--) {
        const code = codes[i];
        if (code) {
            if (code.startsWith('Z')) plageSpeciale.push(code);
            else plageStandard.push(code);
        }
    }

    for (let i = plageStandard.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const valueI = plageStandard[i];
        const valueJ = plageStandard[j];
        if (valueI === undefined || valueJ === undefined) continue;
        plageStandard[i] = valueJ;
        plageStandard[j] = valueI;
    }
    return { codes: plageStandard, reserve: plageSpeciale };
}