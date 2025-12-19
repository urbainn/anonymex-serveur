/*
 * Entrainement d'un modele EMNIST (letters) en Node avec TensorFlow.js.
 * 
 * Si CUDA pas détecté, penser à exporter :
 * export LD_LIBRARY_PATH=/usr/local/cuda-12.9/lib64:$LD_LIBRARY_PATH && TF_CPP_MIN_LOG_LEVEL=0
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const zlib = require("zlib");
const unzipper = require("unzipper");
const tf = require("@tensorflow/tfjs-node-gpu");

const TAILLE_IMAGE = 28;
const CANAUX = 1;
const NB_CLASSES = 26; // EMNIST Letters: A-Z

const URL_ARCHIVE = "https://biometrics.nist.gov/cs_links/EMNIST/gzip.zip";

const DOSSIER_SCRIPTS = __dirname;
const DOSSIER_RACINE = path.resolve(DOSSIER_SCRIPTS, "..");
const DOSSIER_DATA = path.resolve(DOSSIER_RACINE, "datasets", "EMNIST");
const DOSSIER_MODELE = path.resolve(DOSSIER_RACINE, "models", "EMNIST");
const FICHIER_ARCHIVE = path.join(DOSSIER_DATA, "gzip.zip");
const CHEMINS_GZ = {
	trainImagesGz: path.join(DOSSIER_DATA, "emnist-letters-train-images-idx3-ubyte.gz"),
	trainLabelsGz: path.join(DOSSIER_DATA, "emnist-letters-train-labels-idx1-ubyte.gz"),
	testImagesGz: path.join(DOSSIER_DATA, "emnist-letters-test-images-idx3-ubyte.gz"),
	testLabelsGz: path.join(DOSSIER_DATA, "emnist-letters-test-labels-idx1-ubyte.gz")
};

function verifierGPU() {
	const backendName = tf.engine().backendName;
	const backend = tf.backend ? tf.backend() : tf.engine().backendInstance;
	const binding = backend?.binding;
	const numFromBackend = backend?.getNumOfPhysicalGPUs ? backend.getNumOfPhysicalGPUs() : undefined;
	const numFromBinding = binding?.TF_NumPhysicalGPUs ? binding.TF_NumPhysicalGPUs() : undefined;
	const devices = (binding?.TFE_ContextListDevices ? binding.TFE_ContextListDevices() : []) || [];
	const gpuDevices = devices.filter((d) => d && d.toLowerCase().includes("gpu"));
	const numGPUs = gpuDevices.length || numFromBackend || numFromBinding || 0;
	const deviceIds = backend?.getPhysicalDeviceIds ? backend.getPhysicalDeviceIds() : gpuDevices;

	if (backendName !== "tensorflow" || !numGPUs) {
		console.warn(
			"Attention: GPU non detecte par TensorFlow.js (backend=" + backendName + ", numGPUs=" + numGPUs + "). " +
			"Verifiez @tensorflow/tfjs-node-gpu, CUDA/cuDNN (LD_LIBRARY_PATH), et relancez."
		);
	} else {
		console.log(`Backend: ${backendName}, GPUs: ${numGPUs}${deviceIds ? ` (${deviceIds})` : ""}`);
	}
}

/**
 * Recupere un argument cli simple: --cle valeur
 */
function lireArg(nom, defaut) {
	const idx = process.argv.indexOf(`--${nom}`);
	if (idx === -1 || idx + 1 >= process.argv.length) {
		return defaut;
	}
	const brut = process.argv[idx + 1];
	const num = Number(brut);
	return Number.isNaN(num) ? brut : num;
}

function telecharger(url, cible) {
	return new Promise((resolve, reject) => {
		if (fs.existsSync(cible)) {
			return resolve(cible);
		}

		fs.mkdirSync(path.dirname(cible), { recursive: true });
		const fichier = fs.createWriteStream(cible);

		https
			.get(url, (res) => {
				if (res.statusCode !== 200) {
					fichier.close();
					fs.unlink(cible, () => {
						reject(new Error(`Echec telechargement ${url}: status ${res.statusCode}`));
					});
					return;
				}
				res.pipe(fichier);
				fichier.on("finish", () => fichier.close(() => resolve(cible)));
			})
			.on("error", (err) => {
				fichier.close();
				fs.unlink(cible, () => reject(err));
			});
	});
}

function decompresserGz(source, cible) {
	return new Promise((resolve, reject) => {
		if (fs.existsSync(cible)) {
			return resolve(cible);
		}

		const lecture = fs.createReadStream(source);
		const ecriture = fs.createWriteStream(cible);
		const gunzip = zlib.createGunzip();

		lecture
			.pipe(gunzip)
			.pipe(ecriture)
			.on("finish", () => resolve(cible))
			.on("error", reject);
	});
}

async function assurerArchiveExtraite() {
	fs.mkdirSync(DOSSIER_DATA, { recursive: true });

	// Telechargement de l'archive globale si absente
	if (!fs.existsSync(FICHIER_ARCHIVE)) {
		console.log("Telechargement de l'archive EMNIST (gzip.zip)...");
		await telecharger(URL_ARCHIVE, FICHIER_ARCHIVE);
	}

	const fichiersRequis = Object.values(CHEMINS_GZ);
	const dejaExtraits = fichiersRequis.every((f) => fs.existsSync(f));
	if (dejaExtraits) {
		return;
	}

	console.log("Extraction des fichiers EMNIST depuis gzip.zip...");
	await new Promise((resolve, reject) => {
		fs.createReadStream(FICHIER_ARCHIVE)
			.pipe(unzipper.Extract({ path: DOSSIER_DATA }))
			.on("close", resolve)
			.on("error", reject);
	});

	// Si l'archive a cree un sous-dossier gzip/, deplacer les fichiers a la racine DOSSIER_DATA.
	const sousDossier = path.join(DOSSIER_DATA, "gzip");
	if (fs.existsSync(sousDossier)) {
		for (const fichier of fs.readdirSync(sousDossier)) {
			const source = path.join(sousDossier, fichier);
			const destination = path.join(DOSSIER_DATA, fichier);
			if (!fs.existsSync(destination)) {
				fs.renameSync(source, destination);
			}
		}
	}

	const manquants = fichiersRequis.filter((f) => !fs.existsSync(f));
	if (manquants.length > 0) {
		throw new Error(`Extraction incomplete, fichiers manquants: ${manquants.join(", ")}`);
	}
}

async function preparerFichier(url, cibleGz, cibleFinale) {
	await telecharger(url, cibleGz);
	await decompresserGz(cibleGz, cibleFinale);
	return cibleFinale;
}

function lireIdxImages(cheminFichier, maxExemples) {
	const buffer = fs.readFileSync(cheminFichier);
	const nbImages = buffer.readUInt32BE(4);
	const lignes = buffer.readUInt32BE(8);
	const colonnes = buffer.readUInt32BE(12);
	const tailleImage = lignes * colonnes;
	const total = maxExemples ? Math.min(maxExemples, nbImages) : nbImages;
	const images = new Uint8Array(total * tailleImage);

	for (let i = 0; i < total; i += 1) {
		const debut = 16 + i * tailleImage;
		images.set(buffer.subarray(debut, debut + tailleImage), i * tailleImage);
	}

	return { images, lignes, colonnes, total };
}

function lireIdxLabels(cheminFichier, maxExemples) {
	const buffer = fs.readFileSync(cheminFichier);
	const nbLabels = buffer.readUInt32BE(4);
	const total = maxExemples ? Math.min(maxExemples, nbLabels) : nbLabels;
	const labels = new Uint8Array(total);

	for (let i = 0; i < total; i += 1) {
		// Les labels EMNIST Letters vont de 1 a 26; on convertit en 0-25.
		labels[i] = buffer.readUInt8(8 + i) - 1;
	}

	return labels;
}

function tensorsImagesEtLabels(imagesUint8, labelsUint8) {
	const nombre = labelsUint8.length;
	const images = tf.tensor4d(imagesUint8, [nombre, TAILLE_IMAGE, TAILLE_IMAGE, CANAUX], "float32").div(255);
	const labels = tf.tensor1d(labelsUint8, "int32");
	const etiquettes = tf.oneHot(labels, NB_CLASSES).toFloat();
	labels.dispose();
	return { images, etiquettes };
}

function melanger(images, etiquettes) {
	return tf.tidy(() => {
		const indices = Array.from(tf.util.createShuffledIndices(images.shape[0]));
		const idx = tf.tensor1d(indices, "int32");
		const imagesMelangees = images.gather(idx);
		const etiquettesMelangees = etiquettes.gather(idx);
		return { images: imagesMelangees, etiquettes: etiquettesMelangees };
	});
}

function decouperTrainVal(images, etiquettes, valSplit) {
	const total = images.shape[0];
	const nbVal = Math.max(1, Math.round(total * valSplit));
	const nbTrain = total - nbVal;

	const imagesTrain = images.slice([0, 0, 0, 0], [nbTrain, TAILLE_IMAGE, TAILLE_IMAGE, CANAUX]);
	const etiquettesTrain = etiquettes.slice([0, 0], [nbTrain, NB_CLASSES]);
	const imagesVal = images.slice([nbTrain, 0, 0, 0], [nbVal, TAILLE_IMAGE, TAILLE_IMAGE, CANAUX]);
	const etiquettesVal = etiquettes.slice([nbTrain, 0], [nbVal, NB_CLASSES]);

	return { imagesTrain, etiquettesTrain, imagesVal, etiquettesVal };
}

async function chargerDataset(options) {
	const { valSplit, maxTrain } = options;

	const chemins = {
		...CHEMINS_GZ,
		trainImages: path.join(DOSSIER_DATA, "emnist-letters-train-images-idx3-ubyte"),
		trainLabels: path.join(DOSSIER_DATA, "emnist-letters-train-labels-idx1-ubyte"),
		testImages: path.join(DOSSIER_DATA, "emnist-letters-test-images-idx3-ubyte"),
		testLabels: path.join(DOSSIER_DATA, "emnist-letters-test-labels-idx1-ubyte")
	};

	console.log("Telechargement/verification des fichiers EMNIST...");
	await assurerArchiveExtraite();
	await Promise.all([
		decompresserGz(chemins.trainImagesGz, chemins.trainImages),
		decompresserGz(chemins.trainLabelsGz, chemins.trainLabels),
		decompresserGz(chemins.testImagesGz, chemins.testImages),
		decompresserGz(chemins.testLabelsGz, chemins.testLabels)
	]);

	console.log("Chargement en memoire des donnees...");
	const trainImagesIdx = lireIdxImages(chemins.trainImages, maxTrain);
	const trainLabelsIdx = lireIdxLabels(chemins.trainLabels, maxTrain);
	const testImagesIdx = lireIdxImages(chemins.testImages);
	const testLabelsIdx = lireIdxLabels(chemins.testLabels);

	let { images, etiquettes } = tensorsImagesEtLabels(trainImagesIdx.images, trainLabelsIdx);
	const melange = melanger(images, etiquettes);
	images.dispose();
	etiquettes.dispose();
	({ images, etiquettes } = melange);
	const { imagesTrain, etiquettesTrain, imagesVal, etiquettesVal } = decouperTrainVal(images, etiquettes, valSplit);
	images.dispose();
	etiquettes.dispose();

	const test = tensorsImagesEtLabels(testImagesIdx.images, testLabelsIdx);

	return {
		train: { images: imagesTrain, etiquettes: etiquettesTrain },
		val: { images: imagesVal, etiquettes: etiquettesVal },
		test
	};
}

function creerModele() { // STANDARD, TODO: ajouter d'autres "architectures" (légeres, lourdes, etc.) possiblement
	const modele = tf.sequential();

	// Bloc conv 1
	modele.add(
		tf.layers.conv2d({
			inputShape: [TAILLE_IMAGE, TAILLE_IMAGE, CANAUX],
			filters: 32,
			kernelSize: 3,
			activation: "relu",
			padding: "same"
		})
	);
	modele.add(tf.layers.batchNormalization());
	modele.add(tf.layers.conv2d({ filters: 32, kernelSize: 3, activation: "relu", padding: "same" }));
	modele.add(tf.layers.batchNormalization());
	modele.add(tf.layers.maxPooling2d({ poolSize: 2 }));
	modele.add(tf.layers.dropout({ rate: 0.25 }));

	// Bloc conv 2
	modele.add(tf.layers.conv2d({ filters: 64, kernelSize: 3, activation: "relu", padding: "same" }));
	modele.add(tf.layers.batchNormalization());
	modele.add(tf.layers.conv2d({ filters: 64, kernelSize: 3, activation: "relu", padding: "same" }));
	modele.add(tf.layers.batchNormalization());
	modele.add(tf.layers.maxPooling2d({ poolSize: 2 }));
	modele.add(tf.layers.dropout({ rate: 0.25 }));

	// Classifieur
	modele.add(tf.layers.flatten());
	modele.add(tf.layers.dense({ units: 128, activation: "relu" }));
	modele.add(tf.layers.batchNormalization());
	modele.add(tf.layers.dropout({ rate: 0.4 }));
	modele.add(tf.layers.dense({ units: NB_CLASSES, activation: "softmax" }));

	modele.compile({
		optimizer: tf.train.adam(1e-3),
		loss: "categoricalCrossentropy",
		metrics: ["accuracy"]
	});

	return modele;
}

async function entrainer() {
	const epochs = lireArg("epochs", 40);
	const batchSize = lireArg("batch_size", 256);
	const valSplit = lireArg("val_split", 0.08);
	const maxTrain = lireArg("max_train", undefined);

	verifierGPU();

	console.log(`Configuration -> epochs: ${epochs}, batch: ${batchSize}, valSplit: ${valSplit}, maxTrain: ${maxTrain ?? "all"}`);

	const dataset = await chargerDataset({ valSplit, maxTrain });
	const modele = creerModele();
	modele.summary();

	const callbacks = [
		tf.callbacks.earlyStopping({ monitor: "val_accuracy", patience: 6 }),
		new tf.CustomCallback({
			onEpochEnd: async (epoch, logs) => {
				const loss = logs?.loss?.toFixed(4);
				const acc = logs?.acc?.toFixed(4) ?? logs?.accuracy?.toFixed(4);
				const valLoss = logs?.val_loss?.toFixed(4);
				const valAcc = logs?.val_acc?.toFixed(4) ?? logs?.val_accuracy?.toFixed(4);
				console.log(`Epoch ${epoch + 1}: loss=${loss} acc=${acc} val_loss=${valLoss} val_acc=${valAcc}`);
			}
		})
	];

	console.log("Debut de l'entrainement...");
	await modele.fit(dataset.train.images, dataset.train.etiquettes, {
		epochs,
		batchSize,
		validationData: [dataset.val.images, dataset.val.etiquettes],
		shuffle: true,
		callbacks
	});

	console.log("Evaluation sur le test...");
	const [perteTest, accTest] = modele.evaluate(dataset.test.images, dataset.test.etiquettes, {
		batchSize
	});
	const perte = (await perteTest.data())[0];
	const acc = (await accTest.data())[0];
	console.log(`Test -> loss=${perte.toFixed(4)} acc=${acc.toFixed(4)}`);

	fs.mkdirSync(DOSSIER_MODELE, { recursive: true });
	await modele.save(`file://${DOSSIER_MODELE}`);
	console.log(`Modele enregistre dans ${DOSSIER_MODELE} (model.json + poids binaires).`);

	// Nettoyage memoire
	dataset.train.images.dispose();
	dataset.train.etiquettes.dispose();
	dataset.val.images.dispose();
	dataset.val.etiquettes.dispose();
	dataset.test.images.dispose();
	dataset.test.etiquettes.dispose();
	modele.dispose();
	tf.disposeVariables();
}

entrainer().catch((err) => {
	console.error("Echec de l'entrainement EMNIST:", err);
	process.exit(1);
});
