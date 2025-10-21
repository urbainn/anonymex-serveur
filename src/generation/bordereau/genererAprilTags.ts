import { AprilTagFamily } from 'apriltag'
import tagConfigFamille from 'apriltag/families/standard41h12.json'

export function genererAprilTags(doc: PDFKit.PDFDocument) {
    const famille = new AprilTagFamily(tagConfigFamille);
}