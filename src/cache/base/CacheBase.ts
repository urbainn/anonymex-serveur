/**
 * Base abstraite pour les classes de cache. Les éléments sont indexés par une clé.
 * @template I Le type des clés utilisées pour indexer les éléments.
 * @template T Le type des données mises en cache.
 */
export abstract class CacheBase<I, T> {

    private cache: Map<I, T> = new Map();

    /**
     * Récupérer un élément du cache.
     * @param id La clé de l'élément à récupérer.
     * @return élément ou undefined s'il n'est pas en cache.
     */
    public get(id: I): T | undefined {
        return this.cache.get(id);
    }

    /**
     * Mettre un élément en cache.
     * @param id La clé de l'élément à mettre en cache.
     * @param value 
     */
    public set(id: I, value: T): void {
        this.cache.set(id, value);
    }

    /**
     * Vérifier si un élément est en cache.
     * @param id La clé de l'élément à vérifier.
     * @return true si l'élément est en cache, false sinon.
     */
    public has(id: I): boolean {
        return this.cache.has(id);
    }

    /**
     * Supprimer un élément du cache.
     * @param id La clé de l'élément à supprimer.
     */
    public delete(id: I): void {
        this.cache.delete(id);
    }

    /**
     * Vider le cache.
     */
    public clear(): void {
        this.cache.clear();
    }

    /**
     * Nb. d'éléments en cache.
     */
    public size(): number {
        return this.cache.size;
    }

}