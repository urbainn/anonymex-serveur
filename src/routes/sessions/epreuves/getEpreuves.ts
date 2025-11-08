import { Request, Response } from "express";
import { APIEpreuve, APIListEpreuves } from "../../../contracts/epreuves";

export async function getEpreuves(req: Request): Promise<APIListEpreuves> {

    const departements = ["I", "P", "S", "V"];
    const nomsUE = ["Electromagnétisme", "Outils Mathématiques 3", "Physiologie et Pathologie", "Chimie organique", "Materiaux Inorganiques",
        "Atomistique et Reactivité", "Elements de Theorie Quantique du Solide", "Algebre Lineaire Numérique", "Physique des Ondes",
        "Biologie Cellulaire et Moléculaire 3", "Analyse (RMN,IR)", "diversité et évolution des métazoaires", "arithmétique et dénombrement",
        "Biologie du développement", "Microbiologie des eucaryotes", "Architecture et assembleur", "Données multimédia", "Statistique",
        "Découverte de la physiologie", "Introcuction à la modélisation", "Modelisation et Programmation objet 2", "Analyse Complexe",
        "Ecologie microbienne", "Génotype", "Virologie", "Algebre Linéaire et Calcul Matriciel", "Vérification", "Photonique", "Infection et Immunité",
        "Modeles de Calculs", "Education à la  transition Ecologique", "Droit de la Santé", "Topologie des Espaces Métriques"];

    const salles = ["36.1", "36.2", "36.3", "36.4", "36.101", "36.102", "36.103", "36.104", "5.01", "5.02", "5.03", "5.04"];

    function mockEpreuve(): APIEpreuve {
        const random = Math.floor(Math.random() * 10000) + 1;
        const dpt = departements[random % departements.length];
        const nbSalles = (random % 3) + 1;
        const sallesEpreuve = Array.from({ length: nbSalles }, () => salles[Math.floor(Math.random() * salles.length)]!);
        return {
            code: `HA${dpt}${random % 8 + 1}0${random % 9 + 1}${dpt}`,
            nom: nomsUE[random % nomsUE.length]!,
            session: 1,
            statut: (random % 5 + 1) as APIEpreuve["statut"],
            salles: sallesEpreuve,
            date: new Date(2025, 0, (random % 16) + 5, 8 + (random % 7), 0, 0),
            duree: 60 * (1 + (random % 4)), // entre 1h et 4h
        };
    }

    return {
        epreuves: Array.from({ length: 300 }, () => mockEpreuve())
    };
}