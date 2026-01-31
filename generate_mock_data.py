import cv2
import numpy as np
import os
import random

def create_synthetic_ultrasound(width=224, height=224, nodule_type='Benign'):
    # 1. Background: Speckle noise
    img = np.random.normal(0.5, 0.1, (height, width)).astype(np.float32)
    
    # 2. Structure: Thyroid gland (lighter region)
    mask = np.zeros((height, width), dtype=np.float32)
    center = (width // 2, height // 2)
    axes = (width // 3, height // 4)
    cv2.ellipse(mask, center, axes, 0, 0, 360, 1.0, -1)
    # Blur the gland edges
    mask = cv2.GaussianBlur(mask, (21, 21), 10)
    
    # Add gland to background
    img = img + 0.3 * mask
    
    # 3. Nodule Generation
    nodule_mask = np.zeros((height, width), dtype=np.float32)
    
    # Randomize nodule position within gland
    nx = np.random.randint(center[0] - 20, center[0] + 20)
    ny = np.random.randint(center[1] - 10, center[1] + 10)
    
    if nodule_type == 'Benign':
        # Benign: Smooth, round/oval, regular margins, clear halo
        n_axes = (np.random.randint(20, 40), np.random.randint(15, 30))
        cv2.ellipse(nodule_mask, (nx, ny), n_axes, np.random.randint(0, 180), 0, 360, 1.0, -1)
        nodule_intensity = -0.4
        
    elif nodule_type == 'Papillary Thyroid Carcinoma':
        # Papillary: Irregular, microcalcifications (tiny bright spots), hypo-echoic
        n_axes = (np.random.randint(20, 35), np.random.randint(20, 35))
        pts = cv2.ellipse2Poly((nx, ny), n_axes, np.random.randint(0, 180), 0, 360, 10)
        pts += np.random.randint(-3, 3, pts.shape) # Jaguar edges
        cv2.fillPoly(nodule_mask, [pts], 1.0)
        nodule_intensity = -0.6
        # Microcalcifications
        for _ in range(np.random.randint(5, 15)):
            mx = np.random.randint(nx - 15, nx + 15)
            my = np.random.randint(ny - 15, ny + 15)
            cv2.circle(img, (mx, my), 1, 1.0, -1)

    elif nodule_type == 'Follicular Thyroid Carcinoma':
        # Follicular: Rounder but with thick irregular halo, iso-echoic
        n_axes = (np.random.randint(25, 45), np.random.randint(20, 40))
        cv2.ellipse(nodule_mask, (nx, ny), n_axes, np.random.randint(0, 180), 0, 360, 1.0, -1)
        nodule_intensity = -0.3 # Lighter than papillary
        # Thick halo simulation (blur mask edges heavily)
        nodule_mask = cv2.GaussianBlur(nodule_mask, (15, 15), 5)

    elif nodule_type == 'Anaplastic Thyroid Carcinoma':
        # Anaplastic: Very large, invasive, highly irregular, very dark
        n_axes = (np.random.randint(40, 60), np.random.randint(30, 50))
        pts = cv2.ellipse2Poly((nx, ny), n_axes, np.random.randint(0, 180), 0, 360, 20)
        pts += np.random.randint(-10, 10, pts.shape) # Very messy
        cv2.fillPoly(nodule_mask, [pts], 1.0)
        nodule_intensity = -0.7

    elif nodule_type == 'Medullary Thyroid Carcinoma':
        # Medullary: Coarse calcifications (larger bright spots), defined margins
        n_axes = (np.random.randint(20, 35), np.random.randint(25, 40))
        cv2.ellipse(nodule_mask, (nx, ny), n_axes, np.random.randint(0, 180), 0, 360, 1.0, -1)
        nodule_intensity = -0.5
        # Coarse calcifications
        for _ in range(np.random.randint(3, 8)):
            mx = np.random.randint(nx - 10, nx + 10)
            my = np.random.randint(ny - 10, ny + 10)
            cv2.circle(img, (mx, my), 2, 1.0, -1)

    # Blur nodule slightly (generic)
    if nodule_type != 'Follicular Thyroid Carcinoma': # Follicular already blurred
        nodule_mask = cv2.GaussianBlur(nodule_mask, (5, 5), 2)
    
    # Apply nodule
    img = img + nodule_mask * nodule_intensity
    
    # Normalize and convert to uint8
    img = np.clip(img * 255, 0, 255).astype(np.uint8)
    
    # Add some more noise for realism
    noise = np.random.randint(0, 20, (height, width)).astype(np.uint8)
    img = cv2.add(img, noise)
    
    return img

def generate_dataset(base_dir, count=50):
    categories = [
        'Benign', 
        'Papillary Thyroid Carcinoma', 
        'Follicular Thyroid Carcinoma', 
        'Anaplastic Thyroid Carcinoma',
        'Medullary Thyroid Carcinoma'
    ]
    
    # Clean up old binary data first
    # import shutil
    # if os.path.exists(base_dir):
    #     shutil.rmtree(base_dir)

    for cat in categories:
        output_dir = os.path.join(base_dir, cat)
        os.makedirs(output_dir, exist_ok=True)
        print(f"Generating {count} {cat} images...")
        for i in range(count):
            img = create_synthetic_ultrasound(nodule_type=cat)
            filename = f"{cat.replace(' ', '_')}_{i+1}.jpg"
            cv2.imwrite(os.path.join(output_dir, filename), img)

if __name__ == "__main__":
    generate_dataset("dataset", count=100) # 100 images per class for training
