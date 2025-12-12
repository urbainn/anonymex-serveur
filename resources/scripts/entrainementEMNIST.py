"""
Entrainer un petit CNN sur le jeu de données EMNIST Letters.

Principalement inspiré/adapté de https://python-course.eu/machine-learning/training-and-testing-with-mnist.php.
Le code utilise TensorFlow/Keras et tensorflow_datasets pour charger EMNIST.

Lien vers le dataset EMNIST: https://www.kaggle.com/datasets/crawford/emnist?resource=download

Prérequis:
  pip install tensorflow tensorflow-datasets

Exemple d'utilisation:
  python entrainementEMNIST.py --epochs 25 --batch_size 256 --output model.h5

Notes:
 - Les classes (lettres) sont étiquetées de 1 à 26 dans EMNIST Letters, mais sont réassignées en 0-25 (A-Z)

Configuration recommandée pour un modèle robuste destiné aux lettres manuscrites binarisées :
    python3 entrainementEMNIST.py \
        --epochs 220 \
        --batch_size 256 \
        --optimizer adamw \
        --learning_rate 2.5e-4 \
        --weight_decay 1e-5 \
        --label_smoothing 0.0 \
        --lr_schedule cosine \
        --warmup_steps 1200 \
        --mixed_precision \
        --augment \
        --cache \
        --val_split 0.08 \
        --grad_clip 1.0 \
        --swa_start_epoch 160 \
        --output model_final.keras \
        --tfjs_dir model_tfjs
"""

import argparse
import math
import os
import shutil
import sys
import tempfile
import warnings
from datetime import datetime

os.environ.setdefault('PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION', 'python')
warnings.filterwarnings('ignore', message='In the future `np.object`', category=FutureWarning)
warnings.filterwarnings('ignore', message='In the future `np.bool`', category=FutureWarning)

import numpy as np
import tensorflow as tf
import tensorflow_datasets as tfds

try:  # tensorflow_addons est optionnel
    import tensorflow_addons as tfa  # type: ignore
except ImportError:  # pragma: no cover - dépendance facultative
    tfa = None

try:
    from tensorflow.keras.callbacks import StochasticWeightAveraging as KerasSWA  # type: ignore
except Exception:  # pragma: no cover - API optionnelle
    KerasSWA = None

AUTOTUNE = tf.data.AUTOTUNE
DATASET_NAME = 'emnist/letters'
DEG2RAD = math.pi / 180.0
_DATASET_INFO = None

# Fonctions utilitaires pour le dataset et le training (tirées de divers exemples d'optimisation TF/Keras)
def get_dataset_info():
    global _DATASET_INFO
    if _DATASET_INFO is None:
        builder = tfds.builder(DATASET_NAME)
        builder.download_and_prepare()
        _DATASET_INFO = builder.info
    return _DATASET_INFO


def compute_split_sizes(val_split):
    info = get_dataset_info()
    total_train = info.splits['train'].num_examples
    if total_train is None or total_train <= 1:
        raise ValueError('Informations du dataset insuffisantes pour déterminer les splits.')

    val_examples = max(int(round(total_train * val_split)), 1)
    if val_examples >= total_train:
        val_examples = total_train - 1
    train_examples = max(total_train - val_examples, 1)
    return train_examples, val_examples


def build_dataset_metadata(train_examples, val_examples, batch_size):
    steps_per_epoch = max(math.ceil(train_examples / batch_size), 1)
    return {
        'train_examples': train_examples,
        'val_examples': val_examples,
        'steps_per_epoch': steps_per_epoch,
    }


class WarmupCosineSchedule(tf.keras.optimizers.schedules.LearningRateSchedule):
    def __init__(self, base_lr, warmup_steps, total_steps):
        if total_steps <= 0:
            raise ValueError('total_steps must be > 0 for learning rate schedule')
        self.base_lr = float(base_lr)
        self.warmup_steps = max(int(warmup_steps), 0)
        self.total_steps = int(total_steps)
        decay_steps = max(self.total_steps - self.warmup_steps, 1)
        self.cosine = tf.keras.optimizers.schedules.CosineDecay(self.base_lr, decay_steps=decay_steps)

    def __call__(self, step):
        step = tf.cast(step, tf.float32)
        warmup_steps = tf.cast(self.warmup_steps, tf.float32)
        cosine_step = tf.maximum(step - warmup_steps, 0.0)
        cosine_lr = self.cosine(cosine_step)
        if self.warmup_steps == 0:
            return cosine_lr
        warmup_lr = self.base_lr * (step / tf.maximum(warmup_steps, 1.0))
        return tf.where(step < warmup_steps, warmup_lr, cosine_lr)

    def get_config(self):
        return {
            'base_lr': self.base_lr,
            'warmup_steps': self.warmup_steps,
            'total_steps': self.total_steps,
        }


def build_learning_rate(schedule_name, base_lr, warmup_steps, epochs, steps_per_epoch):
    if schedule_name == 'cosine':
        total_steps = max(steps_per_epoch * epochs, 1)
        warmup_steps = min(max(warmup_steps, 0), total_steps)
        return WarmupCosineSchedule(base_lr, warmup_steps, total_steps)
    if warmup_steps > 0:
        tf.get_logger().warning('warmup_steps > 0 mais lr_schedule != "cosine" : warmup ignoré')
    return base_lr


def build_optimizer(optimizer_name, base_lr, weight_decay, schedule_name, warmup_steps, epochs, steps_per_epoch, clipnorm=None):
    learning_rate = build_learning_rate(schedule_name, base_lr, warmup_steps, epochs, steps_per_epoch)
    if optimizer_name == 'adamw':
        return tf.keras.optimizers.AdamW(learning_rate=learning_rate, weight_decay=weight_decay, clipnorm=clipnorm)
    return tf.keras.optimizers.Adam(learning_rate=learning_rate, clipnorm=clipnorm)


def build_loss_function(label_smoothing):
    try:
        return tf.keras.losses.SparseCategoricalCrossentropy(label_smoothing=label_smoothing)
    except TypeError:
        if label_smoothing:
            tf.get_logger().warning('label_smoothing non supporté par cette version de TensorFlow, option ignorée.')
        return tf.keras.losses.SparseCategoricalCrossentropy()


def ensure_numpy_compat_for_tfjs():
    import numpy as np
    if not hasattr(np, 'object'):
        np.object = object
    if not hasattr(np, 'bool'):
        np.bool = bool
    return np


def ensure_tf_estimator_stub():
    import types
    module_name = 'tensorflow.compat.v1.estimator'
    sys.modules.setdefault('tensorflow.compat.v1', tf.compat.v1)
    if hasattr(tf.compat.v1, 'estimator') and hasattr(tf.compat.v1.estimator, 'Exporter'):
        if module_name not in sys.modules:
            sys.modules[module_name] = tf.compat.v1.estimator
        return
    exporter_cls = type('Exporter', (), {})
    estimator_stub = types.SimpleNamespace(Exporter=exporter_cls)
    tf.compat.v1.estimator = estimator_stub
    sys.modules[module_name] = estimator_stub


def ensure_protobuf_python_impl():
    os.environ.setdefault('PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION', 'python')


def ensure_tf_tracking_stub():
    module_name = 'tensorflow.python.training.tracking'
    if module_name in sys.modules:
        return
    try:
        from tensorflow.python.trackable import base as trackable_base
        from tensorflow.python.trackable import data_structures as trackable_data_structures
    except Exception:
        return
    import types
    tracking_module = types.ModuleType(module_name)
    tracking_module.base = trackable_base
    tracking_module.data_structures = trackable_data_structures
    sys.modules[module_name] = tracking_module
    training_pkg_name = 'tensorflow.python.training'
    training_pkg = sys.modules.get(training_pkg_name)
    if training_pkg is None:
        training_pkg = types.ModuleType(training_pkg_name)
        sys.modules[training_pkg_name] = training_pkg
    training_pkg.tracking = tracking_module


class SimpleSWACallback(tf.keras.callbacks.Callback):
    def __init__(self, start_epoch):
        super().__init__()
        if start_epoch is None:
            raise ValueError('start_epoch must be provided for SWA callback')
        self.start_epoch = max(int(start_epoch), 1)
        self._averaged = 0
        self._swa_weights = None

    def on_epoch_end(self, epoch, logs=None):  # noqa: D401
        if epoch + 1 < self.start_epoch:
            return
        weights = self.model.get_weights()
        if self._swa_weights is None:
            self._swa_weights = [np.copy(w) for w in weights]
            self._averaged = 1
            return
        for idx, weight in enumerate(weights):
            self._swa_weights[idx] += (weight - self._swa_weights[idx]) / (self._averaged + 1)
        self._averaged += 1

    def on_train_end(self, logs=None):
        if self._swa_weights is not None:
            self.model.set_weights(self._swa_weights)


def build_swa_callback(start_epoch):
    if start_epoch is None:
        return None
    if KerasSWA is not None:
        try:
            return KerasSWA(start_epoch=start_epoch)
        except Exception:
            pass
    return SimpleSWACallback(start_epoch)


def prepare_model_path_for_tfjs(keras_model_path):
    tmp_dir = None
    lower = keras_model_path.lower()
    if lower.endswith('.keras'):
        tmp_dir = tempfile.mkdtemp(prefix='tfjs_export_')
        h5_path = os.path.join(tmp_dir, 'model_for_tfjs.h5')
        with warnings.catch_warnings():
            warnings.filterwarnings('ignore', module='keras', category=UserWarning)
            model = tf.keras.models.load_model(keras_model_path, compile=False)
            model.save(h5_path)
        try:
            import h5py
            with h5py.File(h5_path, 'r+') as h5_file:
                h5_file.attrs['keras_version'] = '2.12.0'
        except Exception:
            pass
        return h5_path, tmp_dir
    return keras_model_path, tmp_dir


def export_model_to_tfjs(keras_model_path, output_dir):
    ensure_numpy_compat_for_tfjs()
    ensure_tf_estimator_stub()
    ensure_protobuf_python_impl()
    ensure_tf_tracking_stub()
    model_path, tmp_dir = prepare_model_path_for_tfjs(keras_model_path)
    os.makedirs(output_dir, exist_ok=True)
    try:
        converter_fn = None
        try:
            from tensorflowjs.converters import keras_convert
            converter_fn = getattr(keras_convert, 'convert', None)
        except ImportError:
            converter_fn = None

        if converter_fn is not None:
            try:
                converter_fn(model_path, output_dir)
            except Exception as exc:  # noqa: BLE001
                if 'Descriptors cannot be created directly' in str(exc):
                    print("Export TensorFlow.js échoué : problème protobuf. Essayez 'pip install protobuf==3.20.*'.")
                raise
            print(f'Modèle converti en TensorFlow.js dans {output_dir}')
            return
        try:
            from tensorflowjs.converters import converter as tfjs_converter
        except ImportError as exc:
            raise RuntimeError("Impossible d'importer tensorflowjs : installez tensorflowjs (pip install tensorflowjs).") from exc

        args = ['--input_format=keras', model_path, output_dir]
        try:
            tfjs_converter.convert(args)
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError('Export TensorFlow.js échoué via converter.') from exc
        print(f'Modèle converti en TensorFlow.js via converter dans {output_dir}')
    finally:
        if tmp_dir:
            shutil.rmtree(tmp_dir, ignore_errors=True)


def parse_args():
    # Arguments passés en ligne de commande
    p = argparse.ArgumentParser(description='Entrainer un petit CNN sur EMNIST Letters')
    p.add_argument('--batch_size', type=int, default=256)
    p.add_argument('--epochs', type=int, default=30)
    p.add_argument('--learning_rate', type=float, default=1e-3)
    p.add_argument('--output', type=str, default='model.h5')
    p.add_argument('--val_split', type=float, default=0.1, help='Fraction du jeu d\'entraînement à utiliser pour la validation')
    p.add_argument('--seed', type=int, default=1337)
    p.add_argument('--augment', action='store_true', help='Activer l\'augmentation de données à la volée')
    p.add_argument('--prefetch', type=int, default=AUTOTUNE)
    p.add_argument('--cache', action='store_true', help='Mettre en cache le jeu de données en mémoire pour un entraînement plus rapide (si POSSIBLE)')
    p.add_argument('--optimizer', choices=['adam', 'adamw'], default='adam', help='Choix de l\'optimiseur (adam | adamw)')
    p.add_argument('--weight_decay', type=float, default=0.0, help='Coefficient de weight decay (AdamW uniquement)')
    p.add_argument('--label_smoothing', type=float, default=0.0, help='Label smoothing appliqué à la loss')
    p.add_argument('--lr_schedule', choices=['constant', 'cosine'], default='constant', help='Planning du learning rate (constant ou cosine)')
    p.add_argument('--warmup_steps', type=int, default=0, help='Nombre de pas de warmup pour le learning rate')
    p.add_argument('--mixed_precision', action='store_true', help='Active le policy mixed_float16 (si support GPU)')
    p.add_argument('--grad_clip', type=float, default=None, help='Clip global norm des gradients (clipnorm)')
    p.add_argument('--swa_start_epoch', type=int, default=None, help='Epoch à partir de laquelle activer Stochastic Weight Averaging')
    p.add_argument('--tfjs_dir', type=str, default=None, help='Chemin de sortie pour exporter le modèle au format TensorFlow.js (optionnel)')
    return p.parse_args()


def normalize_img(image, label):
    # Mapper uint8 [0,255] -> float32 [0,1].
    image = tf.cast(image, tf.float32) / 255.0
    if image.shape.rank == 2:
        image = tf.expand_dims(image, -1)
    # Les images EMNIST sont pivotées et mirroirées dans TFDS -> réaligner pour ressembler aux scans réels.
    image = tf.image.flip_left_right(tf.image.transpose(image))
    # Les étiquettes EMNIST Letters sont de 1 à 26 -> décalage à 0..25
    label = tf.cast(label, tf.int64) - 1
    return image, label


# Pipeline d'augmentation = transformations aléatoires pour augmenter la diversité des données d'entraînement
# doit refleter les variations réalistes des données (donc prendre en compte le pré-traitement appliqué aux images !!!)
def augment(image, label):
    img = image

    angle = tf.random.uniform([], -2.0, 2.0) * DEG2RAD
    img = tfa_image_rotate(img, angle)

    translations = tf.random.uniform([2], -2, 3, dtype=tf.int32)
    img = translate_image(img, translations)

    img = random_scale(img, min_scale=0.97, max_scale=1.05)

    if tf.random.uniform([]) < 0.6:
        img = random_threshold_binarize(img)

    if tf.random.uniform([]) < 0.8:
        img = random_stroke_adjust(img)

    noise = tf.random.normal(tf.shape(img), mean=0.0, stddev=0.015)
    img = tf.clip_by_value(img + noise, 0.0, 1.0)
    return img, label


def tfa_image_rotate(image, angle):
    if tfa is not None:
        try:
            return tfa.image.rotate(image, angle, interpolation='BILINEAR')
        except Exception:
            pass
    try:
        return tf.image.rotate(image, angle, interpolation='BILINEAR')
    except Exception:
        return image # impossible de faire la rotation


def translate_image(image, translations):
    translations = tf.cast(translations, tf.int32)
    shift_y, shift_x = translations[0], translations[1]
    top = tf.maximum(shift_y, 0)
    bottom = tf.maximum(-shift_y, 0)
    left = tf.maximum(shift_x, 0)
    right = tf.maximum(-shift_x, 0)
    padded = tf.pad(image, [[top, bottom], [left, right], [0, 0]], constant_values=0.0)
    height = tf.shape(image)[0]
    width = tf.shape(image)[1]
    offset_height = tf.maximum(-shift_y, 0)
    offset_width = tf.maximum(-shift_x, 0)
    return tf.image.crop_to_bounding_box(
        padded,
        offset_height=offset_height,
        offset_width=offset_width,
        target_height=height,
        target_width=width,
    )


def random_scale(image, min_scale=0.95, max_scale=1.10):
    scale = tf.random.uniform([], min_scale, max_scale)
    height = tf.shape(image)[0]
    width = tf.shape(image)[1]
    new_height = tf.maximum(tf.cast(tf.round(tf.cast(height, tf.float32) * scale), tf.int32), 1)
    new_width = tf.maximum(tf.cast(tf.round(tf.cast(width, tf.float32) * scale), tf.int32), 1)
    resized = tf.image.resize(image, [new_height, new_width], method='bilinear')
    return tf.image.resize_with_crop_or_pad(resized, height, width)


def random_threshold_binarize(image, min_thresh=0.35, max_thresh=0.65):
    thresh = tf.random.uniform([], min_thresh, max_thresh)
    return tf.where(image > thresh, tf.ones_like(image), tf.zeros_like(image))


def random_stroke_adjust(image):
    choice = tf.random.uniform([])
    img4d = tf.expand_dims(image, axis=0)

    def dilate():
        adjusted = tf.nn.max_pool2d(img4d, ksize=3, strides=1, padding='SAME')
        return tf.clip_by_value(tf.squeeze(adjusted, axis=0), 0.0, 1.0)

    def erode():
        inverted = 1.0 - img4d
        adjusted = 1.0 - tf.nn.max_pool2d(inverted, ksize=3, strides=1, padding='SAME')
        return tf.clip_by_value(tf.squeeze(adjusted, axis=0), 0.0, 1.0)

    def identity():
        return image

    bucket = tf.cast(tf.floor(choice * 3.0), tf.int32)
    bucket = tf.clip_by_value(bucket, 0, 2)
    branches = [dilate, erode, identity]
    return tf.switch_case(bucket, branch_fns=branches)


# ENTRÉE DU MODÈLE
def conv_bn_act(x, filters, kernel_size=3, strides=1):
    x = tf.keras.layers.Conv2D(filters, kernel_size, strides=strides, padding='same', use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    return tf.keras.layers.Activation('relu')(x)


def residual_block(x, filters, strides=1, dropout_rate=0.0):
    shortcut = x
    x = conv_bn_act(x, filters, 3, strides=strides)
    x = tf.keras.layers.Conv2D(filters, 3, padding='same', use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    if strides != 1 or shortcut.shape[-1] != filters:
        shortcut = tf.keras.layers.Conv2D(filters, 1, strides=strides, padding='same', use_bias=False)(shortcut)
        shortcut = tf.keras.layers.BatchNormalization()(shortcut)
    x = tf.keras.layers.Add()([x, shortcut])
    x = tf.keras.layers.Activation('relu')(x)
    if dropout_rate > 0.0:
        x = tf.keras.layers.SpatialDropout2D(dropout_rate)(x)
    return x


def make_model(input_shape=(28, 28, 1), num_classes=26):
    inputs = tf.keras.Input(shape=input_shape)
    x = conv_bn_act(inputs, 64, 3)
    x = conv_bn_act(x, 64, 3)
    x = tf.keras.layers.MaxPooling2D(2)(x)

    x = residual_block(x, 96)
    x = residual_block(x, 96, dropout_rate=0.05)

    x = residual_block(x, 128, strides=2, dropout_rate=0.1)
    x = residual_block(x, 128)

    x = residual_block(x, 160, strides=2, dropout_rate=0.15)
    x = residual_block(x, 192, dropout_rate=0.15)

    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dense(384, activation='relu')(x)
    x = tf.keras.layers.Dropout(0.5)(x)
    outputs = tf.keras.layers.Dense(num_classes, activation='softmax', dtype='float32')(x)

    model = tf.keras.Model(inputs=inputs, outputs=outputs, name='emnist_rescnn')
    return model


# Données
def load_emnist_letters(cache=False, val_split=0.1, batch_size=256, seed=1337, augment_flag=False, prefetch=AUTOTUNE):
    if not 0.0 < val_split < 1.0:
        raise ValueError('val_split doit être dans (0.0, 1.0)')

    train_examples, val_examples = compute_split_sizes(val_split)

    train_instr = tfds.core.ReadInstruction('train', to=train_examples, unit='abs')
    val_instr = tfds.core.ReadInstruction('train', from_=train_examples, to=train_examples + val_examples, unit='abs')

    datasets = tfds.load(
        DATASET_NAME,
        split={
            'train': train_instr,
            'val': val_instr,
            'test': 'test',
        },
        as_supervised=True,
        shuffle_files=True,
    )

    train_ds = datasets['train']
    val_ds = datasets['val']
    test_ds = datasets['test']

    # map normalization
    train_ds = train_ds.map(normalize_img, num_parallel_calls=AUTOTUNE)
    val_ds = val_ds.map(normalize_img, num_parallel_calls=AUTOTUNE)
    test_ds = test_ds.map(normalize_img, num_parallel_calls=AUTOTUNE)

    if cache:
        train_ds = train_ds.cache()
        val_ds = val_ds.cache()
        test_ds = test_ds.cache()

    if augment_flag:
        train_ds = train_ds.map(augment, num_parallel_calls=AUTOTUNE)

    train_ds = train_ds.shuffle(10_000, seed=seed).batch(batch_size).prefetch(prefetch)
    val_ds = val_ds.batch(batch_size).prefetch(prefetch)
    test_ds = test_ds.batch(batch_size).prefetch(prefetch)

    meta = build_dataset_metadata(train_examples, val_examples, batch_size)
    return train_ds, val_ds, test_ds, meta


# Entraînement
def main():
    args = parse_args()

    if args.mixed_precision:
        tf.keras.mixed_precision.set_global_policy('mixed_float16')

    tf.random.set_seed(args.seed)

    print('TensorFlow version:', tf.__version__)

    # datasets
    train_ds, val_ds, test_ds, dataset_meta = load_emnist_letters(
        cache=args.cache,
        val_split=args.val_split,
        batch_size=args.batch_size,
        seed=args.seed,
        augment_flag=args.augment,
        prefetch=args.prefetch,
    )

    # modele
    model = make_model()
    optimizer = build_optimizer(
        optimizer_name=args.optimizer,
        base_lr=args.learning_rate,
        weight_decay=args.weight_decay,
        schedule_name=args.lr_schedule,
        warmup_steps=args.warmup_steps,
        epochs=args.epochs,
        steps_per_epoch=dataset_meta['steps_per_epoch'],
        clipnorm=args.grad_clip,
    )
    loss = build_loss_function(args.label_smoothing)
    model.compile(optimizer=optimizer, loss=loss, metrics=['accuracy'])

    model.summary()

    # callbacks
    now = datetime.now().strftime('%Y%m%d-%H%M%S')
    ckpt_dir = os.path.join('checkpoints', now)
    os.makedirs(ckpt_dir, exist_ok=True)

    callbacks = [
        tf.keras.callbacks.ModelCheckpoint(
            filepath=os.path.join(ckpt_dir, 'best_model.h5'),
            monitor='val_accuracy',
            save_best_only=True,
            save_weights_only=False,
        ),
        tf.keras.callbacks.EarlyStopping(monitor='val_loss', patience=8, restore_best_weights=True),
        tf.keras.callbacks.TensorBoard(log_dir=os.path.join('logs', now)),
    ]

    if args.lr_schedule == 'constant':
        callbacks.insert(1, tf.keras.callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=3, min_lr=1e-6))
    else:
        tf.get_logger().info('lr_schedule != "constant" -> ReduceLROnPlateau désactivé (schedule déjà géré).')

    if args.swa_start_epoch is not None:
        try:
            callbacks.append(build_swa_callback(args.swa_start_epoch))
        except Exception as exc:  # noqa: BLE001
            tf.get_logger().warning('Impossible d\'activer SWA (%s). Continuer sans.', exc)

    history = model.fit(
        train_ds,
        epochs=args.epochs,
        validation_data=val_ds,
        callbacks=callbacks,
    )

    # évaluation
    test_loss, test_acc = model.evaluate(test_ds)
    print(f'Perte test : {test_loss:.4f}  Précision test : {test_acc:.4f}')

    # sauvegarde du modèle final
    out_path = args.output
    print(f'Sauvegarde du modèle final dans {out_path}')
    model.save(out_path)

    if args.tfjs_dir:
        try:
            export_model_to_tfjs(out_path, args.tfjs_dir)
        except Exception as exc:
            print(f"Export TensorFlow.js échoué: {exc}")

    print('\nTerminé. Convertir en TF.js avec :')
    print(f'  tensorflowjs_converter --input_format=keras {out_path} /path/to/tfjs_model_dir')


if __name__ == '__main__':
    main()
