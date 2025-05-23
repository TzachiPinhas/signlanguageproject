# Converting Keras Models to TensorFlow.js Format

This guide explains how to convert a Keras (.h5) model to TensorFlow.js format for use in web applications.

## Prerequisites

- Node.js and npm installed
- TensorFlow.js converter package installed (`@tensorflow/tfjs-converter`)
- Python environment with TensorFlow installed

## Installation

Install the TensorFlow.js converter using npm:

```bash
npm install @tensorflow/tfjs-converter --save-dev
```

For Python conversion, you'll also need:

```bash
pip install tensorflowjs
```

## Conversion Process

### Option 1: Command Line Conversion

1. Download your Keras model (e.g., `sign_language_model.h5`) from the server
2. Use the TensorFlow.js converter to convert the model:

```bash
# Basic conversion
tensorflowjs_converter --input_format=keras /path/to/sign_language_model.h5 /path/to/output_folder

# With quantization for model size reduction
tensorflowjs_converter --input_format=keras --quantize_float16 /path/to/sign_language_model.h5 /path/to/output_folder
```

3. The output folder will contain:
   - `model.json`: The model architecture and metadata
   - One or more binary weight files (e.g., `group1-shard1of2.bin`)

### Option 2: Python Script Conversion

Create a Python script (`convert_model.py`):

```python
import tensorflowjs as tfjs
import tensorflow as tf

# Load the Keras model
model = tf.keras.models.load_model('/path/to/sign_language_model.h5')

# Convert the model to TensorFlow.js format
tfjs.converters.save_keras_model(model, 'tfjs_model')
```

Run the script:

```bash
python convert_model.py
```

## Hosting the Converted Model

After conversion, you need to host the model files on a web server:

1. Place the converted model files (`model.json` and the shard files) in a publicly accessible directory (e.g., `/public/models/sign_language_model/`)
2. Make sure the server sets proper CORS headers to allow access from your web application
3. Update the model URL in your application to point to the `model.json` file

Example server configuration for proper CORS headers:

```
# Apache
<FilesMatch "\.(json|bin)$">
  Header set Access-Control-Allow-Origin "*"
</FilesMatch>

# Nginx
location ~* \.(json|bin)$ {
  add_header 'Access-Control-Allow-Origin' '*';
}
```

## In Your Application

Update your application code to use the converted model:

```javascript
// In useSignLanguageModel.js
const MODEL_URL = {
  TFJS_MODEL: "https://your-server.com/models/sign_language_model/model.json", 
  LOCAL_MODEL: "/models/sign_language_model/model.json"
};

// Set USE_MOCK_MODEL to false when your real model is available
const USE_MOCK_MODEL = false;
```

## Troubleshooting

1. **Size issues**: If your model is very large, consider:
   - Quantization: Use the `--quantize_float16` flag
   - Model pruning: Remove unnecessary parameters before conversion
   - Model optimization: Use TensorFlow model optimization techniques

2. **CORS errors**: Ensure your server is configured to send proper CORS headers

3. **Model compatibility**: Ensure your Keras model uses layers and operations that are compatible with TensorFlow.js

4. **Memory issues**: Large models may cause memory problems in the browser. Consider:
   - Using WebGL backend for better performance
   - Splitting model execution into smaller chunks
   - Progressive loading of model weights

## References

- [Official TensorFlow.js Model Conversion Guide](https://www.tensorflow.org/js/tutorials/conversion/import_keras)
- [TensorFlow.js Converter API](https://github.com/tensorflow/tfjs/tree/master/tfjs-converter)
