/**
 * Millimètres vers points PDF
 * @param mm Valeur en millimètres
 * @returns Valeur en points PDF
 */
export function mmToPoints(mm: number): number {
    return (mm * 72) / 25.4;
}