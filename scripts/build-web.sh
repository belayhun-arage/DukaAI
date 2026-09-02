#!/bin/bash
set -e

echo "Building shared package..."
npm run build -w packages/shared

echo "Building web app..."
npm run build -w apps/web

echo "Build complete!"
