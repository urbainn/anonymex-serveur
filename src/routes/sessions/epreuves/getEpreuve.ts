import { Request, Response } from "express";
import { APIEpreuve } from "../../../contracts/epreuves";
import { mockEpreuve } from "./getEpreuves";

export async function getEpreuve(req: Request): Promise<APIEpreuve> {

    return mockEpreuve();
}
