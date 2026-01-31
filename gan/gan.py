import tensorflow as tf
from tensorflow.keras import layers
import os
import time


def make_generator_model():
    model = tf.keras.Sequential()
    model.add(layers.Dense(7*7*256, use_bias=False, input_shape=(100,)))
    model.add(layers.BatchNormalization())
    model.add(layers.LeakyReLU())

    model.add(layers.Reshape((7, 7, 256)))
    assert model.output_shape == (None, 7, 7, 256)

    model.add(layers.Conv2DTranspose(128, (5, 5), strides=(1, 1), padding='same', use_bias=False))
    model.add(layers.BatchNormalization())
    model.add(layers.LeakyReLU())

    model.add(layers.Conv2DTranspose(64, (5, 5), strides=(2, 2), padding='same', use_bias=False))
    model.add(layers.BatchNormalization())
    model.add(layers.LeakyReLU())

    model.add(layers.Conv2DTranspose(3, (5, 5), strides=(2, 2), padding='same', use_bias=False, activation='tanh'))
    
    # Output: (28, 28, 1) -> adjust layers for 224x224 or target size
    # For 224x224, we need more upsampling
    return model

def make_discriminator_model():
    model = tf.keras.Sequential()
    model.add(layers.Conv2D(64, (5, 5), strides=(2, 2), padding='same', input_shape=[28, 28, 3])) # Adjust shape
    model.add(layers.LeakyReLU())
    model.add(layers.Dropout(0.3))

    model.add(layers.Conv2D(128, (5, 5), strides=(2, 2), padding='same'))
    model.add(layers.LeakyReLU())
    model.add(layers.Dropout(0.3))

    model.add(layers.Flatten())
    model.add(layers.Dense(1))

    return model

def train_gan(dataset, epochs):
    cross_entropy = tf.keras.losses.BinaryCrossentropy(from_logits=True)
    generator = make_generator_model()
    discriminator = make_discriminator_model()
    
    generator_optimizer = tf.keras.optimizers.Adam(1e-4)
    discriminator_optimizer = tf.keras.optimizers.Adam(1e-4)
    

    
    @tf.function
    def train_step(images):
        noise = tf.random.normal([BATCH_SIZE, 100])

        with tf.GradientTape() as gen_tape, tf.GradientTape() as disc_tape:
            generated_images = generator(noise, training=True)

            real_output = discriminator(images, training=True)
            fake_output = discriminator(generated_images, training=True)

            gen_loss = tf.keras.losses.BinaryCrossentropy(from_logits=True)(tf.ones_like(fake_output), fake_output)
            disc_loss = tf.keras.losses.BinaryCrossentropy(from_logits=True)(tf.ones_like(real_output), real_output) + \
                        tf.keras.losses.BinaryCrossentropy(from_logits=True)(tf.zeros_like(fake_output), fake_output)

        gradients_of_generator = gen_tape.gradient(gen_loss, generator.trainable_variables)
        gradients_of_discriminator = disc_tape.gradient(disc_loss, discriminator.trainable_variables)

        generator_optimizer.apply_gradients(zip(gradients_of_generator, generator.trainable_variables))
        discriminator_optimizer.apply_gradients(zip(gradients_of_discriminator, discriminator.trainable_variables))

    print(f"Training GAN for {epochs} epochs...")
    for epoch in range(epochs):
        start = time.time()
        for image_batch in dataset:
            train_step(image_batch)
        print(f'Time for epoch {epoch + 1} is {time.time()-start} sec')

if __name__ == '__main__':
    # Load real images for GAN
    # Training on Papillary Thyroid Carcinoma for demo
    data_dir = "dataset/Papillary Thyroid Carcinoma" 
    if not os.path.exists(data_dir):
        # Fallback to dataset root if specific folder missing
        data_dir = "dataset"
        
    images = []
    # Collect images
    for root, dirs, files in os.walk(data_dir):
        for file in files:
             if file.endswith(('.jpg','.png')):
                 images.append(os.path.join(root, file))
    
    if not images:
        print("No images found for GAN training")
        exit()
        
    # Preprocess
    def load_image(path):
        img = tf.io.read_file(path)
        img = tf.image.decode_jpeg(img, channels=3)
        img = tf.image.resize(img, [28, 28]) # Resize to match GAN output
        img = (tf.cast(img, tf.float32) - 127.5) / 127.5
        return img

    BATCH_SIZE = 16
    train_dataset = tf.data.Dataset.from_tensor_slices(images).map(load_image).shuffle(1000).batch(BATCH_SIZE)
    
    train_gan(train_dataset, epochs=2) # Short run
    print("GAN Training Complete")

