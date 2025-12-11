#!/bin/bash

# Create a timestamped backup snapshot
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="../pull-ups-backup-${TIMESTAMP}"

echo "Creating snapshot backup..."
mkdir -p "${BACKUP_DIR}"

# Copy all files except node_modules and backups
rsync -av --exclude='node_modules' \
          --exclude='*.backup*' \
          --exclude='pull-ups-backup-*' \
          --exclude='.git' \
          ./ "${BACKUP_DIR}/"

echo "Backup created at: ${BACKUP_DIR}"
echo "Files backed up:"
find "${BACKUP_DIR}" -type f | wc -l | xargs echo

