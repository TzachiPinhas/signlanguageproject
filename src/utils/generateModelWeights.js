/**
 * Utility script to generate a binary weight file for the local model.
 * This creates a properly formatted weight file that matches the structure
 * defined in the model.json file.
 */
const fs = require('fs');
const path = require('path');

/**
 * Generate binary data for a weight tensor of the given shape
 * @param {Array<number>} shape - The shape of the tensor
 * @param {String} dtype - The data type (float32)
 * @returns {ArrayBuffer} - The binary data
 */
function generateWeightData(shape, dtype = 'float32') {
  // Calculate total number of elements
  const numElements = shape.reduce((a, b) => a * b, 1);
  
  // Create a buffer of the appropriate size
  const buffer = new ArrayBuffer(numElements * 4); // 4 bytes per float32
  const view = new Float32Array(buffer);
  
  // Fill with small random values
  for (let i = 0; i < numElements; i++) {
    // Generate values between -0.1 and 0.1 for numerical stability
    view[i] = (Math.random() * 0.2) - 0.1;
  }
  
  return buffer;
}

// Weight specifications from the model.json file
const weightSpecs = [
  { name: "lstm_1/kernel", shape: [126, 256], dtype: "float32" },
  { name: "lstm_1/recurrent_kernel", shape: [64, 256], dtype: "float32" },
  { name: "lstm_1/bias", shape: [256], dtype: "float32" },
  { name: "lstm_2/kernel", shape: [64, 128], dtype: "float32" },
  { name: "lstm_2/recurrent_kernel", shape: [32, 128], dtype: "float32" },
  { name: "lstm_2/bias", shape: [128], dtype: "float32" },
  { name: "dense_output/kernel", shape: [32, 20], dtype: "float32" },
  { name: "dense_output/bias", shape: [20], dtype: "float32" }
];

// Generate and concatenate all weight buffers
function generateAllWeights() {
  // Calculate the total byte length needed
  const totalByteLength = weightSpecs.reduce((acc, spec) => {
    const numElements = spec.shape.reduce((a, b) => a * b, 1);
    return acc + (numElements * 4); // 4 bytes per float32
  }, 0);
  
  // Create the output buffer
  const outputBuffer = new ArrayBuffer(totalByteLength);
  const outputView = new Uint8Array(outputBuffer);
  
  let currentOffset = 0;
  
  // Add each weight tensor to the buffer
  for (const weightSpec of weightSpecs) {
    console.log(`Generating weights for ${weightSpec.name} with shape [${weightSpec.shape}]`);
    
    const tensorBuffer = generateWeightData(weightSpec.shape, weightSpec.dtype);
    const tensorView = new Uint8Array(tensorBuffer);
    
    // Copy the tensor data into the output buffer
    outputView.set(tensorView, currentOffset);
    currentOffset += tensorBuffer.byteLength;
  }
  
  return outputBuffer;
}

// Main function to generate and save the weight file
function main() {
  try {
    const weightsBuffer = generateAllWeights();
    
    // Create the directory if it doesn't exist
    const outputDir = path.join(__dirname, '..', '..', 'public', 'models', 'sign_language_model');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Output path for the binary file
    const outputPath = path.join(outputDir, 'group1-shard1of1.bin');
    
    // Write the buffer to file
    fs.writeFileSync(outputPath, Buffer.from(weightsBuffer));
    
    console.log(`Successfully generated ${(weightsBuffer.byteLength / 1024 / 1024).toFixed(2)} MB of weight data at ${outputPath}`);
  } catch (error) {
    console.error('Error generating weights:', error);
  }
}

// Run the main function
main();
