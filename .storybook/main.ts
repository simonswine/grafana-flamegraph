import { mergeRsbuildConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import type { StorybookConfig } from 'storybook-react-rsbuild';

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.tsx'],
  framework: { name: 'storybook-react-rsbuild', options: {} },
  rsbuildFinal: async (config) =>
    mergeRsbuildConfig(config, { plugins: [pluginReact()] }),
};

export default config;
