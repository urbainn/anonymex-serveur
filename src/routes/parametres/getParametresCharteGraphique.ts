import { ImagesImportsCache } from "../../cache/ImagesImportsCache";
import { APIParametresCharteGraphique } from "../../contracts/parametres";

export async function getParametresCharteGraphique(): Promise<APIParametresCharteGraphique> {

    const logos = await ImagesImportsCache.getLogos();

    return {
        logoUniversite: logos.universite ? `data:image/${logos.universite.format ?? 'png'};base64,${logos.universite.buffer.toString('base64')}` : null,
        logoFaculte: logos.faculte ? `data:image/${logos.faculte.format ?? 'png'};base64,${logos.faculte.buffer.toString('base64')}` : null,
    };

}