import { ErreurBase } from "../core/ErreurBase";

abstract class ErreurApi extends ErreurBase { }

// 400 - Requête invalide/mal formée
export class ErreurRequeteInvalide extends ErreurApi { };

// 401 - Non authentifié
export class ErreurNonAuthentifie extends ErreurApi { };

// 403 - Accès refusé
export class ErreurAccesRefuse extends ErreurApi { };

// 500 - Erreur serveur
export class ErreurServeur extends ErreurApi { };