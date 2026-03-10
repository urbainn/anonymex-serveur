/* eslint-disable */

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
const LABELS_EXCLURE = [0, 3, 9, 12, 21]; // A, D, J, M, V (0-indexed)
const NB_CLASSES = 26 - LABELS_EXCLURE.length;

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

	// Tenter plusieurs methodes de detection du nombre de GPUs
	const numFromBackend = backend?.getNumOfPhysicalGPUs ? backend.getNumOfPhysicalGPUs() : 0;
	const numFromBinding = binding?.TF_NumPhysicalGPUs ? binding.TF_NumPhysicalGPUs() : 0;
	const devices = (binding?.TFE_ContextListDevices ? binding.TFE_ContextListDevices() : []) || [];
	const gpuDevices = devices.filter((d) => d && d.toLowerCase().includes("gpu"));
	const numGPUs = gpuDevices.length || numFromBackend || numFromBinding;

	// Si le backend est "tensorflow" avec tfjs-node-gpu, le GPU est utilise
	// meme si les APIs JS ne remontent pas le count (les logs C++ le confirment)
	const estNodeGPU = backendName === "tensorflow" && !!binding;

	if (!estNodeGPU && !numGPUs) {
		console.warn(
			"Attention: GPU non detecte par TensorFlow.js (backend=" + backendName + "). " +
			"Verifiez @tensorflow/tfjs-node-gpu, CUDA/cuDNN (LD_LIBRARY_PATH), et relancez."
		);
	} else {
		const info = numGPUs
			? `${numGPUs} GPU(s) detecte(s)${gpuDevices.length ? ` (${gpuDevices.join(", ")})` : ""}`
			: "GPU actif (tfjs-node-gpu)";
		console.log(`Backend: ${backendName}, ${info}`);
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
	const etiquettes = tf.oneHot(labels, 26).toFloat(); // 26 classes EMNIST originales (reduit ensuite par filtrerLabelsExclus)
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

function filtrerLabelsExclus(images, etiquettes, labelsExclure) {
	// Récupérer les indices de classe
	const classIndices = tf.argMax(etiquettes, 1);
	const classArray = classIndices.dataSync();
	
	// Créer une liste des indices à conserver
	const indicesAConserver = [];
	for (let i = 0; i < classArray.length; i++) {
		if (!labelsExclure.includes(classArray[i])) {
			indicesAConserver.push(i);
		}
	}
	
	classIndices.dispose();
	
	if (indicesAConserver.length === 0) {
		throw new Error("Aucun exemple après filtrage!");
	}
	
	return tf.tidy(() => {
		// Créer un tensor des indices à conserver
		const indices = tf.tensor1d(indicesAConserver, 'int32');
		
		// Utiliser gather pour filtrer
		const imagesFiltr = tf.gather(images, indices);
		const etiquettesFiltr = tf.gather(etiquettes, indices);
		
		// Réduire les étiquettes aux NB_CLASSES restants
		const classesPourChaque = tf.argMax(etiquettesFiltr, 1);
		
		// Créer un mapping des anciennes index vers les nouvelles
		let nouveauIndex = 0;
		const mapping = new Map();
		for (let ancienIndex = 0; ancienIndex < 26; ancienIndex++) {
			if (!labelsExclure.includes(ancienIndex)) {
				mapping.set(ancienIndex, nouveauIndex);
				nouveauIndex++;
			}
		}
		
		// Appliquer le mapping
		const classArray = classesPourChaque.dataSync();
		const nouvellesClassesArray = new Int32Array(classArray.length);
		for (let i = 0; i < classArray.length; i++) {
			nouvellesClassesArray[i] = mapping.get(classArray[i]);
		}
		const nouvellesClasses = tf.tensor1d(nouvellesClassesArray, 'int32');
		const etiquettesReduces = tf.oneHot(nouvellesClasses, NB_CLASSES).toFloat();
		
		return { images: imagesFiltr, etiquettes: etiquettesReduces };
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

/**
 * Augmente le dataset par translations et zooms aleatoires via cropAndResize.
 * Chaque copie applique un decalage ±10% et un zoom ±8% par image.
 */
function augmenterDataset(images, etiquettes, copies) {
	console.log(`Augmentation: ${copies} copies supplementaires -> dataset x${copies + 1}...`);
	const n = images.shape[0];
	const imagesAug = [images];
	const etiquettesAug = [etiquettes];

	for (let c = 0; c < copies; c++) {
		const boxes = [];
		const boxInd = [];
		for (let i = 0; i < n; i++) {
			// Translation aleatoire ±10% + zoom aleatoire ±8%
			const dy = (Math.random() - 0.5) * 0.2;
			const dx = (Math.random() - 0.5) * 0.2;
			const zoom = 1 + (Math.random() - 0.5) * 0.16;
			const halfH = 0.5 * zoom;
			const halfW = 0.5 * zoom;
			boxes.push([
				0.5 + dy - halfH,
				0.5 + dx - halfW,
				0.5 + dy + halfH,
				0.5 + dx + halfW
			]);
			boxInd.push(i);
		}

		const boxesTensor = tf.tensor2d(boxes);
		const boxIndTensor = tf.tensor1d(boxInd, "int32");
		const augmente = tf.image.cropAndResize(
			images, boxesTensor, boxIndTensor,
			[TAILLE_IMAGE, TAILLE_IMAGE]
		);
		boxesTensor.dispose();
		boxIndTensor.dispose();
		imagesAug.push(augmente);
		etiquettesAug.push(etiquettes);
	}

	const toutesImages = tf.concat(imagesAug, 0);
	const toutesEtiquettes = tf.concat(etiquettesAug, 0);

	// Dispose copies augmentees (pas les originaux a l'index 0)
	for (let i = 1; i < imagesAug.length; i++) {
		imagesAug[i].dispose();
	}

	console.log(`Dataset augmente: ${toutesImages.shape[0]} images`);
	return { images: toutesImages, etiquettes: toutesEtiquettes };
}

/**
 * Label smoothing: lisse les etiquettes one-hot pour reduire la sur-confiance.
 * Classe correcte: 1-smoothing + smoothing/nbClasses, autres: smoothing/nbClasses.
 */
function appliquerLabelSmoothing(etiquettes, smoothing) {
	return tf.tidy(() => {
		const nbClasses = etiquettes.shape[1];
		return etiquettes.mul(1 - smoothing).add(smoothing / nbClasses);
	});
}

/**
 * Callback ReduceLR: reduit le learning rate quand val_loss stagne.
 */
function creerReduceLRCallback(modele, facteur = 0.5, patience = 3, minLR = 1e-6) {
	let meilleurValLoss = Infinity;
	let compteur = 0;

	return new tf.CustomCallback({
		onEpochEnd: async (_epoch, logs) => {
			const valLoss = logs?.val_loss;
			if (valLoss === undefined) return;

			if (valLoss < meilleurValLoss - 1e-4) {
				meilleurValLoss = valLoss;
				compteur = 0;
			} else {
				compteur++;
				if (compteur >= patience) {
					const ancienLR = modele.optimizer.learningRate;
					const nouveauLR = Math.max(ancienLR * facteur, minLR);
					modele.optimizer.learningRate = nouveauLR;
					console.log(`  ReduceLR: val_loss stagnant depuis ${patience} epochs. LR: ${ancienLR.toExponential(2)} -> ${nouveauLR.toExponential(2)}`);
					compteur = 0;
					meilleurValLoss = valLoss;
				}
			}
		}
	});
}

async function chargerDataset(options) {
	const { valSplit, maxTrain, augCopies = 0, labelSmoothing = 0 } = options;

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
	
	console.log("Filtrage des labels exclus (V, D, J, M, A)...");
	const filtre = filtrerLabelsExclus(images, etiquettes, LABELS_EXCLURE);
	images.dispose();
	etiquettes.dispose();
	({ images, etiquettes } = filtre);
	console.log(`${images.shape[0]} exemples apres filtrage`);
	
	let { imagesTrain, etiquettesTrain, imagesVal, etiquettesVal } = decouperTrainVal(images, etiquettes, valSplit);
	images.dispose();
	etiquettes.dispose();

	// Data augmentation sur le train
	if (augCopies > 0) {
		const aug = augmenterDataset(imagesTrain, etiquettesTrain, augCopies);
		imagesTrain.dispose();
		etiquettesTrain.dispose();
		({ images: imagesTrain, etiquettes: etiquettesTrain } = aug);
		// Re-melanger apres augmentation pour eviter que les copies soient groupees
		const melAug = melanger(imagesTrain, etiquettesTrain);
		imagesTrain.dispose();
		etiquettesTrain.dispose();
		({ images: imagesTrain, etiquettes: etiquettesTrain } = melAug);
	}

	// Label smoothing sur le train uniquement (pas val/test pour garder des metriques pures)
	if (labelSmoothing > 0) {
		const lisse = appliquerLabelSmoothing(etiquettesTrain, labelSmoothing);
		etiquettesTrain.dispose();
		etiquettesTrain = lisse;
	}

	let test = tensorsImagesEtLabels(testImagesIdx.images, testLabelsIdx);

	const testFiltre = filtrerLabelsExclus(
		test.images,
		test.etiquettes,
		LABELS_EXCLURE
	);
	test.images.dispose();
	test.etiquettes.dispose();
	test = testFiltre;

	return {
		train: { images: imagesTrain, etiquettes: etiquettesTrain },
		val: { images: imagesVal, etiquettes: etiquettesVal },
		test
	};
}

function creerModele() { // STANDARD, TODO: ajouter d'autres "architectures" (légeres, lourdes, etc.) possiblement
	const modele = tf.sequential();

	// Input + bruit gaussien pour améliorer la généralisation sur données manuscrites réelles
	modele.add(tf.layers.inputLayer({ inputShape: [TAILLE_IMAGE, TAILLE_IMAGE, CANAUX] }));
	modele.add(tf.layers.gaussianNoise({ stddev: 0.05 }));

	// Bloc conv 1
	modele.add(
		tf.layers.conv2d({
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
	modele.add(tf.layers.dense({ units: 256, activation: "relu" }));
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
	const augCopies = lireArg("aug_copies", 2);
	const labelSmoothing = lireArg("label_smoothing", 0.1);

	verifierGPU();

	console.log(`Configuration -> epochs: ${epochs}, batch: ${batchSize}, valSplit: ${valSplit}, maxTrain: ${maxTrain ?? "all"}, augCopies: ${augCopies}, labelSmoothing: ${labelSmoothing}`);

	const dataset = await chargerDataset({ valSplit, maxTrain, augCopies, labelSmoothing });
	const modele = creerModele();
	modele.summary();

	const callbacks = [
		tf.callbacks.earlyStopping({ monitor: "val_acc", patience: 6 }),
		creerReduceLRCallback(modele),
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
