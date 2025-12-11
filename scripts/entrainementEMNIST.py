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

Configuration utilisée pour entraîner le modèle utilisé :
    python3 entrainementEMNIST.py \
        --epochs 120 \
        --batch_size 256 \
        --optimizer adamw \
        --learning_rate 5e-4 \
        --weight_decay 1e-5 \
        --label_smoothing 0.05 \
        --lr_schedule cosine \
        --warmup_steps 500 \
        --mixed_precision \
        --augment \
        --cache \
        --output model_final.h5
"""

import argparse
import math
import os
from datetime import datetime

import tensorflow as tf
import tensorflow_datasets as tfds

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


def build_optimizer(optimizer_name, base_lr, weight_decay, schedule_name, warmup_steps, epochs, steps_per_epoch):
    learning_rate = build_learning_rate(schedule_name, base_lr, warmup_steps, epochs, steps_per_epoch)
    if optimizer_name == 'adamw':
        return tf.keras.optimizers.AdamW(learning_rate=learning_rate, weight_decay=weight_decay)
    return tf.keras.optimizers.Adam(learning_rate=learning_rate)


def build_loss_function(label_smoothing):
    try:
        return tf.keras.losses.SparseCategoricalCrossentropy(label_smoothing=label_smoothing)
    except TypeError:
        if label_smoothing:
            tf.get_logger().warning('label_smoothing non supporté par cette version de TensorFlow, option ignorée.')
        return tf.keras.losses.SparseCategoricalCrossentropy()


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
    return p.parse_args()


def normalize_img(image, label):
    # Mapper uint8 [0,255] -> float32 [0,1].
    image = tf.cast(image, tf.float32) / 255.0
    if image.shape.rank == 2:
        image = tf.expand_dims(image, -1)
    # Les étiquettes EMNIST Letters sont de 1 à 26 -> décalage à 0..25
    label = tf.cast(label, tf.int64) - 1
    return image, label


# Pipeline d'augmentation = transformations aléatoires pour augmenter la diversité des données d'entraînement
# doit refleter les variations réalistes des données (donc prendre en compte le pré-traitement appliqué aux images !!!)
def augment(image, label):
    img = image

    max_deg = tf.random.uniform([], 1.0, 3.0)
    max_angle = max_deg * DEG2RAD
    angle = tf.random.uniform([], -max_angle, max_angle)
    img = tfa_image_rotate(img, angle)

    shift_mag = tf.random.uniform([2], 1, 5, dtype=tf.int32)
    shift_sign = tf.random.uniform([2], 0, 2, dtype=tf.int32) * 2 - 1
    translations = shift_mag * shift_sign
    img = translate_image(img, translations)

    img = random_scale(img, min_scale=0.95, max_scale=1.10)

    img = tf.image.random_brightness(img, max_delta=0.15)
    img = tf.image.random_contrast(img, lower=0.8, upper=1.2)
    img = tf.clip_by_value(img, 0.0, 1.0)
    return img, label


def tfa_image_rotate(image, angle):
    try:
        import tensorflow_addons as tfa
        return tfa.image.rotate(image, angle, interpolation='BILINEAR')
    except Exception:
        try:
            return tf.image.rotate(image, angle, interpolation='BILINEAR')
        except Exception:
            return image # impossible de faire la rotation


def translate_image(image, translations):
    """Translate image by integer pixel offsets without wrap-around artifacts."""
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


# ENTRÉE DU MODÈLE
def make_model(input_shape=(28, 28, 1), num_classes=26):
    inputs = tf.keras.Input(shape=input_shape)
    x = tf.keras.layers.Conv2D(32, 3, padding='same', activation='relu')(inputs)
    x = tf.keras.layers.Conv2D(32, 3, padding='same', activation='relu')(x)
    x = tf.keras.layers.MaxPooling2D(2)(x)
    x = tf.keras.layers.BatchNormalization()(x)

    x = tf.keras.layers.Conv2D(64, 3, padding='same', activation='relu')(x)
    x = tf.keras.layers.Conv2D(64, 3, padding='same', activation='relu')(x)
    x = tf.keras.layers.MaxPooling2D(2)(x)
    x = tf.keras.layers.BatchNormalization()(x)

    x = tf.keras.layers.Flatten()(x)
    x = tf.keras.layers.Dense(128, activation='relu')(x)
    x = tf.keras.layers.Dropout(0.4)(x)
    outputs = tf.keras.layers.Dense(num_classes, activation='softmax', dtype='float32')(x)

    model = tf.keras.Model(inputs=inputs, outputs=outputs, name='emnist_small_cnn')
    return model


# Données
def load_emnist_letters(cache=False, val_split=0.1, batch_size=256, seed=1337, augment_flag=False, prefetch=AUTOTUNE):
    if not 0.0 < val_split < 1.0:
        raise ValueError('val_split doit être dans (0.0, 1.0)')

    train_examples, val_examples = compute_split_sizes(val_split)

    raw_train = tfds.load(
        DATASET_NAME,
        split='train',
        as_supervised=True,
        shuffle_files=False,
    )
    test_ds = tfds.load(
        DATASET_NAME,
        split='test',
        as_supervised=True,
        shuffle_files=False,
    )

    train_ds = raw_train.take(train_examples)
    val_ds = raw_train.skip(train_examples).take(val_examples)

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
        tf.keras.callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=3, min_lr=1e-6),
        tf.keras.callbacks.EarlyStopping(monitor='val_loss', patience=8, restore_best_weights=True),
        tf.keras.callbacks.TensorBoard(log_dir=os.path.join('logs', now)),
    ]

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

    print('\nTerminé. Convertir en TF.js avec :')
    print(f'  tensorflowjs_converter --input_format=keras {out_path} /path/to/tfjs_model_dir')


if __name__ == '__main__':
    main()
