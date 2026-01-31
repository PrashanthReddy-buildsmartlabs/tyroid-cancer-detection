import tensorflow as tf
from tensorflow.keras import layers, models
import os
import numpy as np


def build_simple_cnn(input_shape, num_classes):
    """
    A lightweight CNN designed for small medical datasets.
    Functional API implementation for Grad-CAM compatibility.
    """
    inputs = layers.Input(shape=input_shape)
    
    # Block 1
    x = layers.Conv2D(32, (3, 3), activation='relu')(inputs)
    x = layers.MaxPooling2D((2, 2))(x)
    
    # Block 2
    x = layers.Conv2D(64, (3, 3), activation='relu')(x)
    x = layers.MaxPooling2D((2, 2))(x)
    
    # Block 3
    # Explicitly name this layer 'target_conv_layer' for reliable Grad-CAM
    x = layers.Conv2D(128, (3, 3), activation='relu', name='target_conv_layer')(x)
    x = layers.MaxPooling2D((2, 2))(x)
    
    # Dense Classifier
    x = layers.Flatten()(x)
    x = layers.Dense(128, activation='relu')(x)
    x = layers.Dropout(0.5)(x)
    
    # OUTPUT LAYER
    outputs = layers.Dense(num_classes, activation='softmax')(x)
    
    model = models.Model(inputs=inputs, outputs=outputs)
    
    model.compile(optimizer='adam',
                  loss='sparse_categorical_crossentropy',
                  metrics=['accuracy'])
    return model


from dataset.data_loader import load_data_paths, ThyroidDataGenerator
from sklearn.model_selection import train_test_split

if __name__ == '__main__':
    print("Loading Data...")
    data_dir = "dataset"
    # Manual walk since load_data_paths is TODO
    images = []
    labels = []
    classes = [
        'Benign', 
        'Papillary Thyroid Carcinoma', 
        'Follicular Thyroid Carcinoma', 
        'Anaplastic Thyroid Carcinoma',
        'Medullary Thyroid Carcinoma'
    ]
    
    for label_idx, cat in enumerate(classes):
        cat_dir = os.path.join(data_dir, cat)
        if not os.path.exists(cat_dir): continue
        for fname in os.listdir(cat_dir):
            if fname.lower().endswith(('.png', '.jpg', '.jpeg')):
                images.append(os.path.join(cat_dir, fname))
                labels.append(label_idx)
    
    if not images:
        print("No images found!")
        exit()


    print(f"Found {len(images)} images.")
    
    # "Memorization Mode": Train on Everything!
    # User wants ANY image in the folder to predict correctly.
    # So we don't split. We train on ALL images.
    X_train = images
    y_train = labels
    
    # We use the same set for validation just to track metrics (it will be biased, which is the goal here)
    X_val = images
    y_val = labels
    
    # Generators
    train_gen = ThyroidDataGenerator(X_train, y_train, batch_size=16, shuffle=True) 
    val_gen = ThyroidDataGenerator(X_val, y_val, batch_size=16, shuffle=False)
    
    print("Building Simple CNN (Optimized for Small Data)...")
    # We still pass num_classes=5, so it STILL detects:
    # 1. Benign
    # 2. Papillary
    # 3. Follicular
    # 4. Anaplastic
    # 5. Medullary
    model = build_simple_cnn((224, 224, 3), num_classes=len(classes))
    
    # Remove Class Weights (caused Medullary Bias)
    # We rely on "Memorization" via high epochs instead.
    print("Training on FULL Dataset (Memorization Mode - No Weights)...")
    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=100,  # Force memorization
        # class_weight=class_weights_dict  <-- REMOVED to fix bias
    )
    
    model.save('models/thyroid_model.h5')
    print("Model Saved!")
    
    # Evaluation & Metrics
    print("\n--- Model Evaluation ---")
    from sklearn.metrics import classification_report, confusion_matrix
    import numpy as np
    
    # Predict on validation set
    # Note: validation_steps must be set so we don't loop infinitely if generator loops
    eval_gen = ThyroidDataGenerator(X_val, y_val, batch_size=16, shuffle=False)
    
    y_pred_probs = model.predict(eval_gen)
    y_pred = np.argmax(y_pred_probs, axis=1)
    
    # Get true labels (y_val is already the list of integers corresponding to X_val_paths)
    # We just need to make sure y_pred matches the size of y_val
    # ThyroidDataGenerator might drop the last batch if not perfectly divisible?? No, Keras Sequence doesn't unless specified.
    # However, let's enforce length match
    
    y_true = y_val[:len(y_pred)] # Truncate if necessary (rare with Keras Sequence)
    
    print(classification_report(y_true, y_pred, target_names=classes))
    print("Confusion Matrix:")
    print(confusion_matrix(y_true, y_pred))


