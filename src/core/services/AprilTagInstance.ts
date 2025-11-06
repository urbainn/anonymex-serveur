import type AprilTag from "@monumental-works/apriltag-node";

export class AprilTagInstance {
    private static instanceur: typeof AprilTag | null = null;
    private static aprilTag: AprilTag | null = null;

    public static async getInstance(): Promise<AprilTag> {
        if (AprilTagInstance.instanceur === null) {
            AprilTagInstance.instanceur = (await import("@monumental-works/apriltag-node")).default;
        }

        // instance de détection singleton
        if (AprilTagInstance.aprilTag === null) {
            AprilTagInstance.aprilTag = new AprilTagInstance.instanceur("tagStandard41h12", {
                quadDecimate: 1.0, // Downscaling
                quadSigma: 1.0, // Flou
                refineEdges: true,
                decodeSharpening: 0.25,
                // todo: nb de threads?
            });
        }

        // S'assurer que l'instance est initialisée
        await AprilTagInstance.aprilTag.ensureInitialized();

        return AprilTagInstance.aprilTag;
    }
}