/**
 * Utility to check and diagnose model loading issues
 * Run this script with:
 *   node src/utils/checkModel.js
 */

async function checkModelAvailability() {
  console.log('Sign Language Model Checker');
  console.log('==========================');
  
  try {
    // Check if TensorFlow.js can be loaded
    console.log('1. Checking if TensorFlow.js is available in Node.js...');
    try {
      // This would work in a browser environment, but in Node.js we'd need @tensorflow/tfjs-node
      console.log('Note: This diagnostic tool needs to be run in a browser environment');
      console.log('     or with @tensorflow/tfjs-node installed');
    } catch (e) {
      console.log('✗ Could not load TensorFlow.js:', e.message);
    }
    
    // Check if remote model URLs are accessible
    console.log('\n2. Checking remote URLs...');
    const modelUrls = [
      "https://signlanguagewebapp-a5eff0dabmhwfphu.westeurope-01.azurewebsites.net/download-model",
      "https://signlanguagewebapp-a5eff0dabmhwfphu.westeurope-01.azurewebsites.net/download-tfjs-model"
    ];
    
    for (const url of modelUrls) {
      try {
        console.log(`   Testing URL: ${url}`);
        const response = await fetch(url, { method: 'HEAD' });
        
        if (response.ok) {
          console.log(`   ✓ URL is accessible (Status: ${response.status})`);
          
          // Get content info
          const contentType = response.headers.get('content-type');
          const contentLength = response.headers.get('content-length');
          
          console.log(`     Content-Type: ${contentType || 'Not specified'}`);
          console.log(`     Size: ${contentLength ? Math.round(contentLength / 1024 / 1024 * 100) / 100 + ' MB' : 'Unknown'}`);
        } else {
          console.log(`   ✗ URL returned status ${response.status} ${response.statusText}`);
        }
      } catch (e) {
        console.log(`   ✗ Error accessing URL: ${e.message}`);
      }
    }
      // Check local model
    console.log('\n3. Checking local model files...');
    
    try {
      // Check if model.json exists and can be loaded
      const localModelUrl = '/models/sign_language_model/model.json';
      console.log(`   Testing local model: ${localModelUrl}`);
      
      const modelResponse = await fetch(localModelUrl);
      if (modelResponse.ok) {
        console.log(`   ✓ model.json is accessible`);
        
        // Parse and validate model.json structure
        try {
          const modelJson = await modelResponse.json();
          
          // Validate model topology
          if (modelJson.modelTopology && modelJson.modelTopology.class_name) {
            console.log(`   ✓ Model type: ${modelJson.modelTopology.class_name}`);
          } else {
            console.log(`   ✗ Invalid model topology structure`);
          }
          
          // Check for weights manifest
          if (modelJson.weightsManifest && modelJson.weightsManifest.length > 0) {
            const weights = modelJson.weightsManifest[0].weights;
            console.log(`   ✓ Weights found: ${weights.length} tensors defined`);
            
            // Check for binary weights file
            if (modelJson.weightsManifest[0].paths && modelJson.weightsManifest[0].paths.length > 0) {
              const weightPath = modelJson.weightsManifest[0].paths[0];
              const weightResponse = await fetch(`/models/sign_language_model/${weightPath}`);
              
              if (weightResponse.ok) {
                const weightBuffer = await weightResponse.arrayBuffer();
                console.log(`   ✓ Weight file ${weightPath} found (${(weightBuffer.byteLength / 1024).toFixed(2)} KB)`);
              } else {
                console.log(`   ✗ Weight file ${weightPath} not found: ${weightResponse.status}`);
              }
            }
          } else {
            console.log(`   ✗ No weights manifest found in model.json`);
          }
        } catch (parseError) {
          console.log(`   ✗ Error parsing model.json: ${parseError.message}`);
        }
      } else {
        console.log(`   ✗ model.json not accessible: ${modelResponse.status}`);
      }
    } catch (localError) {
      console.log(`   ✗ Error checking local model: ${localError.message}`);
    }
    
    // Check TensorFlow.js version compatibility
    console.log('\n4. Checking TensorFlow.js compatibility...');
    try {
      const tfjs = window.tf;
      if (tfjs) {
        console.log(`   ✓ TensorFlow.js found: version ${tfjs.version_core || tfjs.version || 'unknown'}`);
        console.log(`   ✓ Backend: ${tfjs.getBackend()}`);
        
        // Check WebGL availability
        if (tfjs.backend().getGPGPUContext) {
          console.log(`   ✓ WebGL is available and active`);
        } else {
          console.log(`   ⚠️ WebGL not active. Using ${tfjs.getBackend()} which may be slower`);
        }
      } else {
        console.log(`   ✗ TensorFlow.js not found in window object`);
      }
    } catch (tfjsError) {
      console.log(`   ✗ Error checking TensorFlow.js: ${tfjsError.message}`);
    }
    
    console.log('\n5. Checking browser storage limits...');
    try {
      // Check IndexedDB availability
      if (window.indexedDB) {
        console.log(`   ✓ IndexedDB is available`);
      } else {
        console.log(`   ✗ IndexedDB is not available`);
      }
      
      // Check localStorage
      try {
        const testKey = '_test_storage_';
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
        console.log(`   ✓ localStorage is available`);
      } catch (e) {
        console.log(`   ✗ localStorage error: ${e.message}`);
      }
    } catch (storageError) {
      console.log(`   ✗ Error checking storage: ${storageError.message}`);
    }
    
    console.log('\nDiagnostic Recommendations:');
    console.log('1. Ensure your internet connection is stable');
    console.log('2. Verify the model URL is still valid and hasn\'t expired');
    console.log('3. Check browser storage (cookies, localStorage, IndexedDB) is not full');
    console.log('4. Try running the app in incognito/private mode');
    console.log('5. Check if your browser supports WebGL (needed for TensorFlow.js)');
    
  } catch (e) {
    console.error('Error during diagnostics:', e);
  }
}

// Check if running in browser or Node.js
if (typeof window === 'undefined') {
  console.log('Running in Node.js environment');
  checkModelAvailability().catch(console.error);
} else {
  console.log('Running in browser environment');
  window.runModelCheck = checkModelAvailability;
}
