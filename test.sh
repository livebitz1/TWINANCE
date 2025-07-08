#!/bin/bash

# Run linting to check for any issues
echo "Running linting..."
npm run lint

# Check for build errors
echo "Checking for build errors..."
npm run build

echo "Test complete."
