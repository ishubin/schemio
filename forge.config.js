module.exports = {
  packagerConfig: {},
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.electron.main.config.js',
        renderer: {
          config: './webpack.electron.renderer.config.js',
          entryPoints: [
            {
              html: './src/electron/renderer/index.html',
              js: './src/electron/renderer/renderer.js',
              name: 'main_window',
              preload: {
                js: './src/electron/preload.js',
              },
            },
          ],
        },
      },
    },
  ],
};
