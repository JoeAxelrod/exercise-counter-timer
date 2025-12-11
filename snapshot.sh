#!/bin/bash

# Create a ZIP snapshot of the project
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ZIP_NAME="pull-ups-snapshot-${TIMESTAMP}.zip"

echo "Creating ZIP snapshot..."
zip -r "${ZIP_NAME}" . \
    -x "node_modules/*" \
    -x "*.backup*" \
    -x "pull-ups-backup-*" \
    -x "pull-ups-snapshot-*.zip" \
    -x ".git/*" \
    -x ".DS_Store"

echo "Snapshot created: ${ZIP_NAME}"
ls -lh "${ZIP_NAME}"

