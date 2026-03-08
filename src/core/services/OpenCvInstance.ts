import cvPret from "@techstark/opencv-js";

export type CvType = typeof cvPret;

export class OpenCvInstance {
    private static instance: CvType | null = null;

    public static async getInstance(): Promise<CvType> {
        if (!OpenCvInstance.instance) {
            OpenCvInstance.instance = await cvPret;
        }
        return OpenCvInstance.instance;
    }

}