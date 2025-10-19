#!/usr/bin/env bash
set -euo pipefail

# Config
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_NAME="$(basename "$PROJECT_DIR")"
DATE="$(date +%Y%m%d-%H%M%S)"
DEST_DIR="$HOME/Backups"
ARCHIVE="$DEST_DIR/${PROJECT_NAME}-${DATE}.tar.gz"

mkdir -p "$DEST_DIR"

# Create archive (source-only; excludes build, deps, secrets, local DB)
tar -czf "$ARCHIVE" -C "$PROJECT_DIR" \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='out' \
  --exclude='dist' \
  --exclude='*.log' \
  --exclude='.env' \
  --exclude='*.env.local' \
  --exclude='prisma/*.db' \
  --exclude='prisma/*.db-journal' \
  --exclude='.DS_Store' \
  --exclude='.vscode' \
  --exclude='.idea' \
  .

echo "Backup created: $ARCHIVE"
