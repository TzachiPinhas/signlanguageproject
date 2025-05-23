# Sign Language Model Loading Process

This document explains how the sign language recognition model is loaded in our application and the fallback mechanisms that provide resilience.

## Model Loading Flow

The model loading process follows this sequence:

1. **Browser Cache Check**:
   - First checks IndexedDB cache using key "sign-language-model-v6"
   - If not found, falls back to localStorage cache

2. **Remote Model Download**:
   - If no cached model is found, first checks if the remote endpoints are accessible
   - Downloads model from ZIP file at the remote endpoint
   - The ZIP file contains model.json and binary weight files
   - Extracts contents in memory and passes to TensorFlow.js

3. **Direct Model URL Fallback**:
   - If ZIP download fails, tries loading directly from the model URL endpoint

4. **Local Model Fallback**:
   - If remote models are inaccessible, loads the local model from `/public/models/sign_language_model/`
   - The local model consists of model.json and group1-shard1of1.bin
   - A timeout prevents hanging if the model is invalid

5. **Mock Model Last Resort**:
   - If all other methods fail, creates a mock model in memory
   - The mock model provides random predictions for demonstration purposes

## Model Storage Locations

- **IndexedDB**: Primary storage location for the model using TensorFlow.js built-in caching
- **localStorage**: Backup for smaller models (used only if IndexedDB fails)
- **sessionStorage**: Stores compressed model ZIP data for quick reload without re-downloading

## Error Handling

The model loading process includes several error handling mechanisms:

1. **Timeouts**: Prevents indefinite loading if a model source is unresponsive
2. **Stage Monitoring**: Detects when any loading stage takes too long (10 seconds)
3. **Endpoint Availability Checking**: Tests if remote endpoints are accessible before attempting downloads
4. **Validation**: Checks if loaded models have valid layer structures

## Diagnostics

For troubleshooting model loading issues:

1. **ModelStorageManager Component**: Located in Settings screen to clear browser storage caches
2. **Model Checker Tool**: Available at `/model-checker.html` to test model endpoints and loading

## Generating Local Model Files

The local model files can be regenerated using the utility script:

```
node src/utils/generateModelWeights.js
```

This script creates a binary weights file that matches the architecture defined in model.json.

## Common Issues and Solutions

1. **Model Stuck on Loading**:
   - Check network connectivity
   - Clear browser caches using the ModelStorageManager
   - Verify remote endpoints are accessible with model-checker.html

2. **Model Loading Error**:
   - Check browser console for specific errors
   - Ensure WebGL is supported by your browser
   - Verify that model files are correctly formatted

3. **Out of Memory Errors**:
   - Can occur on devices with limited memory
   - Refresh the page to clear memory
   - Try using a different browser
