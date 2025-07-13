// This file provides a centralized way to access package.json information
// to avoid TypeScript issues with direct JSON imports in the build process

import packageJson from '../package.json' with { type: 'json' };

export const { version, engines } = packageJson;
export default packageJson;
