// CommonJS module for Jest transformer
const swcJest = require('@swc/jest');

// Custom transformer that handles import.meta.url
module.exports = {
  ...swcJest.createTransformer({
    jsc: {
      parser: {
        syntax: 'typescript',
        tsx: false,
        decorators: true,
      },
      target: 'es2022',
      transform: {
        react: {
          runtime: 'automatic',
        },
      },
    },
    module: {
      type: 'commonjs',
    },
  }),

  process(src, filename, config, options) {
    // Replace import.meta.url with a CommonJS equivalent before transformation
    let modifiedSrc = src;

    // First check if the file uses const __filename = ...
    // If it does, we need to use a different variable name
    const usesLocalFilename = modifiedSrc.includes('const __filename =');

    // Replace import.meta.url with a valid CommonJS expression
    if (usesLocalFilename) {
      // Use a different variable name to avoid conflicts
      modifiedSrc = modifiedSrc.replace(
        /import\.meta\.url/g,
        `(require('url').pathToFileURL(require('path').resolve(__dirname, require('path').basename(module.filename))).href)`,
      );
    } else {
      modifiedSrc = modifiedSrc.replace(
        /import\.meta\.url/g,
        `(require('url').pathToFileURL(__filename).href)`,
      );
    }

    // Now run the standard SWC transformation
    return swcJest
      .createTransformer({
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: false,
            decorators: true,
          },
          target: 'es2022',
          transform: {
            react: {
              runtime: 'automatic',
            },
          },
        },
        module: {
          type: 'commonjs',
        },
      })
      .process(modifiedSrc, filename, config, options);
  },
};
