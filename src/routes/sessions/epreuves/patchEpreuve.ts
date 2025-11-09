import { Request, Response } from "express";
import { APIUpdateEpreuve } from "../../../contracts/epreuves";
import { mockEpreuve } from "./getEpreuves";

export async function patchEpreuve(req: Request): Promise<APIUpdateEpreuve> {

    return mockEpreuve();
}