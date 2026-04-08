import { ElementEnCache } from "./ElementEnCacheBase";

/**
 * Représente un élément cachable, lié à un enregistrement de base de données.
 * @template D Type des données brutes (issues de la base de données) utilisées pour construire l'élément en cache.
 */
export abstract class ElementEnCacheBdd<D> extends ElementEnCache {
    abstract toData(): D;
}