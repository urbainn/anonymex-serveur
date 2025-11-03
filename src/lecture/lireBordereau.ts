import { readFileSync } from 'fs';
import { extraireScans, ScanData } from './preparation/extraireScans';
import { preparerScan } from './preparation/preparerScan';

// WIP : chemin deviendra buffer/busboy
export function lireBordereau(chemin: string): void {

    const buffer = readFileSync(chemin);
    const uint8 = new Uint8Array(buffer);

    extraireScans({ data: uint8, encoding: 'buffer', mimeType: 'image/jpeg' }, async (scan: ScanData, data: Uint8ClampedArray | Uint8Array) => {
        await preparerScan(scan, data);
    });

}