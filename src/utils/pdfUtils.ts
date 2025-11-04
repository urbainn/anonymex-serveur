/**
 * Millimètres vers points PDF
 * @param mm Valeur en millimètres
 * @returns Valeur en points PDF
 */
export function mmToPoints(mm: number): number {
    return (mm * 72) / 25.4;
}

/**
 * Points PDF vers millimètres
 * @param points Valeur en points PDF
 * @returns Valeur en millimètres
 */
export function pointsToMm(points: number): number {
    return (points * 25.4) / 72;
}