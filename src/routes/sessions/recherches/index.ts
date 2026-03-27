import { Router } from "express";
import { getRechercheSalle } from "./getRechercheSalle";
import { getRechercheHeure } from "./getRechercheHeure";
import { getRechercheSalleHeure } from "./getRechercheSalleHeure";
import { getRechercheEtudiant } from "./getRechercheEtudiant";
import { useRest } from "../../useRest";
import { getRecherche } from "./getRecherche";

const recherchesRouteur = Router({ mergeParams: true });

// GET /sessions/:session/recherche?q=une+recherche
recherchesRouteur.get<{ session: string }>
    ("/", (req, res) => useRest(() => getRecherche(req.params.session, req.query.q?.toString() ?? ''), req, res));

// GET /sessions/:session/recherche/salle/:codesalle
recherchesRouteur.get<{ session: string, codesalle: string }>
    ("/salle/:codesalle", (req, res) => useRest(() => getRechercheSalle(req.params.session, req.params.codesalle), req, res));

// GET /sessions/:session/recherche/heure/:horodatage
recherchesRouteur.get<{ session: string, horodatage: string }>
    ("/heure/:horodatage", (req, res) => useRest(() => getRechercheHeure(req.params.session, req.params.horodatage), req, res));

// GET /sessions/:session/recherche/salleheure/:codesalle/:horodatage
recherchesRouteur.get<{ session: string, codesalle: string, horodatage: string }>
    ("/salleheure/:codesalle/:horodatage", (req, res) => useRest(() => getRechercheSalleHeure(req.params.session, req.params.codesalle, req.params.horodatage), req, res));

// GET /sessions/:session/recherche/etudiant/:codeetudiant
recherchesRouteur.get<{ session: string, codeetudiant: string }>
    ("/etudiant/:codeetudiant", (req, res) => useRest(() => getRechercheEtudiant(req.params.session, req.params.codeetudiant), req, res));

export { recherchesRouteur as recherchesRouteur };