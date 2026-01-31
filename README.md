# Thyroid Cancer Detection System

## Overview
This is a medical-grade AI application for detecting thyroid cancer from ultrasound images using a Hybrid CNN + LSTM model and providing explainable results via Grad-CAM.

## Features
- **Hybrid Deep Learning Model**: CNN (ResNet50) for feature extraction + LSTM for sequence analysis.
- **GAN Data Augmentation**: DCGAN for generating synthetic training data.
- **Explainable AI**: Grad-CAM heatmaps to visualize tumor regions.
- **Clinical Support**: Confidence scores and actionable recommendations.
- **Privacy First**: Local execution, no cloud storage, temporary file cleanup.

## Prerequisities
- Python 3.9+ ("python" command)
- Node.js 18+ ("npm" command)

## Setup & Running

### 1. Backend Setup
```bash
cd "d:/Thyroid Cancer Detection"
pip install -r requirements.txt
python backend/app.py
```
*Server runs on http://localhost:5000*

### 2. Frontend Setup
```bash
cd "d:/Thyroid Cancer Detection/frontend"
npm install
npm run dev
```
*App runs on http://localhost:5173*

## Project Structure
- `/dataset`: Image data (Benign/Malignant)
- `/models`: Saved model weights
- `/backend`: Flask API
- `/frontend`: React + Tailwind UI
- `/gan`: GAN training scripts
- `/gradcam`: Explainability utilities
- `train.py`: Model training script
- `report_generator.py`: PDF generation module

## Usage
1. Open the web app.
2. Upload a thyroid ultrasound image.
3. View the prediction, confidence, and heatmap.
4. Download the PDF report.

## Note on Model
The system requires a trained model to make accurate predictions. Run `python train.py` (after populating `dataset/`) to train the model. For demo purposes without training, the system may error or needs a mock mode (check `backend/app.py` logic).
