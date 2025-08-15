/**
 * Custom Jest transformer for handling import.meta.env syntax from Vite
 * This is an ES module that will preprocess files before babel-jest
 */

import babelJest from 'babel-jest';

// Create a transformer instance with babel presets
const babelTransformer = babelJest.createTransformer({
  presets: ['@babel/preset-env', '@babel/preset-react']
});

// Export ES module
export default {
  process(sourceText, sourcePath, options) {
    // Replace import.meta.env.* with global.process.env.*
    // This handles Vite's import.meta.env syntax that Jest can't process
    const processedSource = sourceText
      .replace(/import\.meta\.env\.(\w+)/g, 'process.env.$1')
      .replace(/import\.meta\.env/g, 'process.env');
    
    // Pass to babel-jest for further processing
    return babelTransformer.process(processedSource, sourcePath, options);
  }
};
