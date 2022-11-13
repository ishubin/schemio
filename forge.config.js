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
        devContentSecurityPolicy: "default-src *  data: blob: filesystem: about: ws: wss: 'unsafe-inline' 'unsafe-eval'; script-src * data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src * data: blob: 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src * data: blob: ; style-src * data: blob: 'unsafe-inline'; font-src * data: blob: 'unsafe-inline'; frame-ancestors * ;",
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
