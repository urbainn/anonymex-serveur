export abstract class ElementEnCache {
    private instancieTime: number;

    constructor() {
        this.instancieTime = Date.now();
    }

    /** Obtenir le temps d'instanciation en millisecondes */
    public getInstancieTime(): number {
        return this.instancieTime;
    }
}