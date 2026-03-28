import { Router } from "express";
import { useRest } from "../../../useRest";
import { postConvocationPresents } from "./postConvocationPresents";
import { getConvocations } from "./getConvocations";
import { patchConvocation } from "./patchConvocation";
import { deleteConvocations } from "./deleteConvocations";

const convocationsRouteur = Router({ mergeParams: true });

convocationsRouteur.get<{ session: string, code: string }>("/", (req, res) =>
    useRest(() => getConvocations(req.params.session, req.params.code), req, res));

convocationsRouteur.delete<{ session: string, code: string }>("/", (req, res) =>
    useRest(() => deleteConvocations(req.params.session, req.params.code, req.body), req, res))

convocationsRouteur.patch<{ session: string, code: string, codeAnonymat: string }>("/:codeAnonymat", (req, res) =>
    useRest(() => patchConvocation(req.params.session, req.params.code, req.params.codeAnonymat, req.body), req, res));

convocationsRouteur.post<{ session: string, code: string, nbPresents: string }>("/presents/:nbPresents", (req, res) =>
    useRest(() => postConvocationPresents(req.params.session, req.params.code, req.params.nbPresents), req, res));

export { convocationsRouteur as convocationsRouteur };