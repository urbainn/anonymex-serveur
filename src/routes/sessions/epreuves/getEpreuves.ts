import { Request, Response } from "express";
import { APIEpreuve, APIListEpreuves, EpreuveStatut } from "../../../contracts/epreuves";

const departements = ["I", "P", "S", "V"];
const nomsUE = ["Electromagnétisme", "Outils Mathématiques 3", "Physiologie et Pathologie", "Chimie organique", "Materiaux Inorganiques",
    "Atomistique et Reactivité", "Elements de Theorie Quantique du Solide", "Algebre Lineaire Numérique", "Physique des Ondes",
    "Biologie Cellulaire et Moléculaire 3", "Analyse (RMN,IR)", "diversité et évolution des métazoaires", "arithmétique et dénombrement",
    "Biologie du développement", "Microbiologie des eucaryotes", "Architecture et assembleur", "Données multimédia", "Statistique",
    "Découverte de la physiologie", "Introcuction à la modélisation", "Modelisation et Programmation objet 2", "Analyse Complexe",
    "Ecologie microbienne", "Génotype", "Virologie", "Algebre Linéaire et Calcul Matriciel", "Vérification", "Photonique", "Infection et Immunité",
    "Modeles de Calculs", "Education à la  transition Ecologique", "Droit de la Santé", "Topologie des Espaces Métriques"];

const salles = ["36.1", "36.2", "36.3", "36.4", "36.101", "36.102", "36.103", "36.104", "5.01", "5.02", "5.03", "5.04"];

export function mockEpreuve(): APIEpreuve {
    const random = Math.floor(Math.random() * 10000) + 1;

    const dateEpreuve = new Date(
        Date.now() + ((random % 30) - 15) * 24 * 60 * 60 * 1000 // entre -15 et +15 jours 
    ).setHours(9 + (random % 8), 0, 0, 0);

    const dpt = departements[random % departements.length];
    const nbSalles = (random % 3) + 1;
    const sallesEpreuve = Array.from({ length: nbSalles }, () => salles[Math.floor(Math.random() * salles.length)]!);

    return {
        code: `HA${dpt}${random % 8 + 1}0${random % 9 + 1}${dpt}`,
        nom: nomsUE[random % nomsUE.length]!,
        session: 1,
        statut: EpreuveStatut.MATERIEL_NON_IMPRIME,
        salles: sallesEpreuve,
        date: dateEpreuve,
        duree: 60 * (1 + (random % 4)), // entre 1h et 4h
    };
}

export async function getEpreuves(req: Request): Promise<APIListEpreuves> {

    // optimisation abyssale : TEMPORAIRE!!!!
    const epreuves = Array.from({ length: 300 }, () => mockEpreuve()).sort((a, b) => a.date - b.date);
    const now = Date.now();

    const epreuvesAvenir = epreuves.filter(epreuve => epreuve.date >= now);
    const epreuvesPassees = epreuves.filter(epreuve => epreuve.date < now);

    return {
        epreuvesAvenir,
        epreuvesPassees
    };
}