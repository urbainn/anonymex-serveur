import { Router } from "express";
import { useRest } from "../../../useRest";
import { postConvocationPresents } from "./postConvocationPresents";
import { getConvocations } from "./getConvocations";
import { patchConvocation } from "./patchConvocation";
import { deleteConvocations } from "./deleteConvocations";
import { getConvocationsSupplementaires } from "./getConvocationsSupplementaires";
import { patchConvocationSupplementaire } from "./patchConvocationSupplementaire";
import { postConvocationsTransfert } from "./postConvocationsTransfert";

const convocationsRouteur = Router({ mergeParams: true });

convocationsRouteur.get<{ session: string, code: string }>("/", (req, res) =>
    useRest(() => getConvocations(req.params.session, req.params.code), req, res));

convocationsRouteur.get<{ session: string, code: string }>("/supplementaires", (req, res) =>
    useRest(() => getConvocationsSupplementaires(req.params.session, req.params.code), req, res))

convocationsRouteur.delete<{ session: string, code: string }>("/", (req, res) =>
    useRest(() => deleteConvocations(req.params.session, req.params.code, req.body.codesAnonymats), req, res))

convocationsRouteur.patch<{ session: string, code: string, codeAnonymat: string }>("/:codeAnonymat", (req, res) =>
    useRest(() => patchConvocation(req.params.session, req.params.code, req.params.codeAnonymat, req.body), req, res));

convocationsRouteur.post<{ session: string, code: string }>("/presents", (req, res) =>
    useRest(() => postConvocationPresents(req.params.session, req.params.code, req.body.nbPresents), req, res));

convocationsRouteur.post<{ session: string, code: string, codeAnonymat: string }>("/supplementaires/:codeAnonymat", (req, res) =>
    useRest(() => patchConvocationSupplementaire(req.params.session, req.params.code, req.params.codeAnonymat, req.body.numeroEtudiant), req, res));

convocationsRouteur.post<{ session: string, code: string }>("/transfert", (req, res) =>
    useRest(() => postConvocationsTransfert(req.params.session, req.params.code, req.body), req, res));

export { convocationsRouteur as convocationsRouteur };