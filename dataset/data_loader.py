import cv2
import os
import numpy as np
from tensorflow.keras.utils import Sequence

class ThyroidDataGenerator(Sequence):
    def __init__(self, image_paths, labels, batch_size=32, image_size=(224, 224), shuffle=True):
        self.image_paths = image_paths
        self.labels = labels
        self.batch_size = batch_size
        self.image_size = image_size
        self.shuffle = shuffle
        self.on_epoch_end()

    def __len__(self):
        return int(np.floor(len(self.image_paths) / self.batch_size))

    def __getitem__(self, index):
        indexes = self.indexes[index*self.batch_size:(index+1)*self.batch_size]
        batch_image_paths = [self.image_paths[k] for k in indexes]
        batch_labels = [self.labels[k] for k in indexes]
        
        X, y = self.__data_generation(batch_image_paths, batch_labels)
        return X, y

    def on_epoch_end(self):
        self.indexes = np.arange(len(self.image_paths))
        if self.shuffle:
            np.random.shuffle(self.indexes)

    def __data_generation(self, batch_image_paths, batch_labels):
        X = np.empty((self.batch_size, *self.image_size, 3))
        y = np.empty((self.batch_size), dtype=int)

        for i, path in enumerate(batch_image_paths):
            img = cv2.imread(path)
            if img is None:
                continue 
            img = cv2.resize(img, self.image_size)
            
            # Real-time Augmentation
            if self.shuffle: # Only augment training set (shuffle=True usually implies training)
                # Random Horizontal Flip
                if np.random.rand() > 0.5:
                    img = cv2.flip(img, 1)
                
                # Random Rotation (+/- 20 degrees)
                angle = np.random.uniform(-20, 20)
                h, w = img.shape[:2]
                M = cv2.getRotationMatrix2D((w/2, h/2), angle, 1)
                img = cv2.warpAffine(img, M, (w, h))
                
                # Random Zoom (0.8 - 1.2)
                scale = np.random.uniform(0.8, 1.2)
                # Ensure valid crop after zoom
                # Simpler: just resize slightly and crop center
                
            img = img / 255.0  # Normalize
            X[i,] = img
            y[i] = batch_labels[i]

        return X, y

def load_data_paths(data_dir):
    # Assumes structure: data_dir/Benign, data_dir/Malignant/...
    images = []
    labels = []
    classes = []
    # TODO: Traverse directory and collect paths
    return images, labels, classes
