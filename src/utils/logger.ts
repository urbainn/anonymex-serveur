export function logInfo(titre: string, message: string): void {
    console.log(`${logHeader(titre, styles.fg.cyan)}${message}${styles.reset}`);
}

export function logWarn(titre: string, message: string): void {
    console.log(`${logHeader(titre, styles.fg.yellow)}${message}${styles.reset}`);
}

export function logError(titre: string, message: string): void {
    console.log(`${logHeader(titre, styles.fg.red)}${message}${styles.reset}`);
}

/**
 * Renvoit le header du log au format [HH:MM:SS] TITRE |
 * @param titre 18 chars. max
 * @param styleTitre 
 * @returns 
 */
function logHeader(titre: string, styleTitre: string): string {
    const date = new Date();
    const horodatage = [date.getHours(), date.getMinutes(), date.getSeconds()];

    return `${styles.fg.black + styles.bg.white}[${horodatage.map((element) => element < 10 ? `0${element}` : element).join(':')}]${styles.reset} `
        + `${styleTitre}${titre.padStart(18)}${styles.reset} | ${styles.fg.white}`;
}

export const styles = {
    // Styles généraux
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    hidden: '\x1b[8m',
    default: '\x1b[0m\x1b[37m',

    // Foreground : couleur du texte
    fg: {
        black: '\x1b[30m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
        crimson: '\x1b[38m'
    },

    // Background : couleur de surlignage
    bg: {
        black: '\x1b[40m',
        red: '\x1b[41m',
        green: '\x1b[42m',
        yellow: '\x1b[43m',
        blue: '\x1b[44m',
        magenta: '\x1b[45m',
        cyan: '\x1b[46m',
        white: '\x1b[47m',
        crimson: '\x1b[48m'
    }
};
