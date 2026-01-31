
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import os

def create_report(file_path, patient_data, prediction_result):
    c = canvas.Canvas(file_path, pagesize=letter)
    width, height = letter
    
    # Title
    c.setFont("Helvetica-Bold", 20)
    c.drawString(100, 750, "Thyroid Cancer Detection Report")
    
    # Line
    c.line(100, 740, 500, 740)
    
    # Patient Data (Mock)
    c.setFont("Helvetica", 12)
    y = 700
    c.drawString(100, y, f"Date: {patient_data.get('date', 'N/A')}")
    y -= 20
    
    # Prediction Results
    c.setFont("Helvetica-Bold", 14)
    y -= 20
    c.drawString(100, y, "Diagnosis Results:")
    c.setFont("Helvetica", 12)
    y -= 20
    c.drawString(100, y, f"Classification: {prediction_result.get('result', 'Unknown')}")
    y -= 20
    c.drawString(100, y, f"Confidence: {prediction_result.get('confidence', 'N/A')}")
    y -= 20
    c.drawString(100, y, f"Recommendation: {prediction_result.get('recommendation', 'N/A')}")
    
    # Images (if available)
    y -= 220
    try:
        # Original Image
        orig_url = prediction_result.get('original_url')
        if orig_url:
            # Convert URL to local path (assuming running locally)
            # URL like /uploads/filename -> frontend/public/uploads/filename
            local_path = f"d:/Thyroid Cancer Detection/frontend/public{orig_url}"
            if os.path.exists(local_path):
                c.drawImage(local_path, 100, y, width=200, height=200, preserveAspectRatio=True)
                c.drawString(100, y-20, "Original Ultrasound")
        
        # Heatmap
        hm_url = prediction_result.get('heatmap_url')
        if hm_url:
            local_hm_path = f"d:/Thyroid Cancer Detection/frontend/public{hm_url}"
            if os.path.exists(local_hm_path):
                c.drawImage(local_hm_path, 320, y, width=200, height=200, preserveAspectRatio=True)
                c.drawString(320, y-20, "Grad-CAM Heatmap")
    except Exception as e:
        c.drawString(100, y-40, f"Error adding images: {str(e)}")

    c.save()

