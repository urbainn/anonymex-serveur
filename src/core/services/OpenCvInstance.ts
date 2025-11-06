import cvPret from "@techstark/opencv-js";

export class OpenCvInstance {
    private static instance: typeof cvPret | null = null;

    public static async getInstance(): Promise<typeof cvPret> {
        if (!OpenCvInstance.instance) {
            OpenCvInstance.instance = await cvPret;
        }
        return OpenCvInstance.instance;
    }

}