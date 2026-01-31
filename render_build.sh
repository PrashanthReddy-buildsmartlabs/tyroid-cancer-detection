#!/bin/bash
# Exit on error
set -o errexit

echo "--- Installing Python Dependencies ---"
pip install -r requirements.txt

echo "--- Installing Node.js Dependencies & Building Frontend ---"
cd frontend
npm install
npm run build
cd ..

echo "--- Build Complete ---"
