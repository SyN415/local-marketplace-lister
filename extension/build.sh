#!/bin/bash

# Define the output zip file name
OUTPUT_FILE="marketplace-lister-extension.zip"

# Remove existing zip file if it exists
if [ -f "$OUTPUT_FILE" ]; then
    rm "$OUTPUT_FILE"
    echo "Removed existing $OUTPUT_FILE"
fi

# Create a new zip file excluding unwanted files
# Exclude: tests, build script itself, hidden files, source maps (optional), etc.
zip -r "$OUTPUT_FILE" . -x "*.git*" -x "test/*" -x "build.sh" -x "*.DS_Store*"

echo "Successfully created $OUTPUT_FILE"