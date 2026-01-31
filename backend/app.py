import os
import cv2
import numpy as np
import tensorflow as tf
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import sys

# Add parent directory to path to import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from train import build_simple_cnn
from gradcam.utils import make_gradcam_heatmap, save_and_display_gradcam
from report_generator import create_report

app = Flask(__name__)
CORS(app)

# Define paths relative to this file to ensure they work from any CWD
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'frontend', 'public', 'uploads')
RESULT_FOLDER = os.path.join(BASE_DIR, 'frontend', 'public', 'results')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULT_FOLDER, exist_ok=True)

# Global Model
model = None

def get_model():
    global model
    if model is None:
        print("Loading model lazily...")
        try:
            model = build_simple_cnn((224, 224, 3), 5) # Multi-class (5 types)
            weights_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models', 'thyroid_model.h5')
            
            if os.path.exists(weights_path):
                model.load_weights(weights_path)
                print(f"Model weights loaded from {weights_path}")
            else:
                print(f"Weights not found at {weights_path}, using untrained model.")
        except Exception as e:
            print(f"Error loading model: {e}")
            model = None
    return model

# Removed immediate load_model() call for Cloud Stability

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    
    # Preprocess
    img = cv2.imread(filepath)
    img_resized = cv2.resize(img, (224, 224))
    img_array = np.expand_dims(img_resized / 255.0, axis=0) # Normalize
    
    # Predict
    loaded_model = get_model()
    if loaded_model:
        preds = loaded_model.predict(img_array)
        class_idx = np.argmax(preds[0])
        confidence = float(preds[0][class_idx])
        
        labels = [
            'Benign', 
            'Papillary Thyroid Carcinoma', 
            'Follicular Thyroid Carcinoma', 
            'Anaplastic Thyroid Carcinoma',
            'Medullary Thyroid Carcinoma'
        ]
        
        # Safety check if index out of range (in case model mismatch during dev)
        if class_idx >= len(labels):
            result = "Unknown"
        else:
            result = labels[class_idx]
        
        # Grad-CAM
        try:
            # We explicitly named the layer 'target_conv_layer' in train.py (Functional API)
            heatmap = make_gradcam_heatmap(img_array, loaded_model, 'target_conv_layer')
            heatmap_filename = f"heatmap_{filename}"
            heatmap_path = os.path.join(RESULT_FOLDER, heatmap_filename)
            save_and_display_gradcam(filepath, heatmap, heatmap_path)
            
            # Recommendation Logic
            if result == 'Benign':
                recommendation = "Follow-up scan / Routine monitoring"
            elif result == 'Papillary Thyroid Carcinoma':
                recommendation = "FNAC / Possible Lobectomy"
            elif result == 'Follicular Thyroid Carcinoma':
                recommendation = "Diagnostic Hemithyroidectomy / Histopathology"
            elif result == 'Anaplastic Thyroid Carcinoma':
                recommendation = "Urgent Oncologist Referral / Palliative Care"
            elif result == 'Medullary Thyroid Carcinoma':
                recommendation = "Serum Calcitonin Test / Total Thyroidectomy"
            else:
                recommendation = "Clinical Correlation Required"
            
            # Determine high-level diagnosis
            diagnosis = "Benign" if result == "Benign" else "Malignant"
            
            heatmap_url = f"/results/{heatmap_filename}"
            original_url = f"/uploads/{filename}"
            
            print(f"DEBUG: Returning Heatmap URL: {heatmap_url}")
            print(f"DEBUG: Returning Original URL: {original_url}")

            return jsonify({
                'result': result, # Specific subtype (e.g. Papillary...)
                'diagnosis': diagnosis, # High level (Benign/Malignant) for UI coloring
                'confidence': f"{confidence*100:.2f}%",
                'recommendation': recommendation,
                'heatmap_url': heatmap_url,
                'original_url': original_url
            })
        except Exception as e:
             return jsonify({'error': f"Grad-CAM failed: {str(e)}"}), 500
    else:
        return jsonify({'error': "Model not loaded"}), 500

@app.route('/generate_report', methods=['POST'])
def generate_report():
    data = request.json
    report_path = os.path.join(RESULT_FOLDER, f"report_{data.get('id', 'temp')}.pdf")
    create_report(report_path, data, data.get('prediction', {}))
    return send_file(report_path, as_attachment=True)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'running', 'model_loaded': model is not None})

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_file(os.path.join(UPLOAD_FOLDER, filename))

@app.route('/results/<filename>')
def result_file(filename):
    return send_file(os.path.join(RESULT_FOLDER, filename))

if __name__ == '__main__':
    print("Starting Flask Server...")
    app.run(debug=True, port=5000)

