/**
 * Calcule la distance de Hamming entre deux chaînes de même longueur
 * @param a
 * @param b
 */
function hamming(a: string, b: string): number {
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
function indiceVersMot(index: number, length: number, alphabet: string): string {
    let word = "";
    const Q = alphabet.length;
    for (let i = 0; i < length; i++) {
        const lettre = alphabet[index % Q]!;
        word = lettre + word;
        index = Math.floor(index / Q);
    }
    return word;
}

/**
 * Génère les n premiers codes avec distance minimale donnée
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
        // TEMP: on mélange l'alphabet pour equidistribution
        let candidat = '';
        for (let j = 0; j < taille; j++) {
            const randomIndex = Math.floor(Math.random() * alphabet.length);
            candidat += alphabet[randomIndex];
        }

        // TEMP AUSSI : éviter d'avoir 2 lettres identiques dans le code
        const lettresUniques = new Set(candidat.split(""));
        if (lettresUniques.size !== candidat.length) continue;

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