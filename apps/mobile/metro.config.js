const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const config = getDefaultConfig(projectRoot);

// Keep Expo's SDK-specific watch paths and also include workspace-hoisted packages.
config.watchFolders = [...new Set([...(config.watchFolders || []), workspaceRoot])];
config.resolver.nodeModulesPaths = [...new Set([
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
  ...(config.resolver.nodeModulesPaths || []),
])];

module.exports = config;
