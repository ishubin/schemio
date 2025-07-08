module.exports = {
  packagerConfig: {
    icon: 'design/app-icons/icons/all/icon',
    osxSign: {
      identity: process.env.MACOS_CERTIFICATE_NAME,
      'hardened-runtime': true,
      entitlements: 'entitlements.plist',
      'entitlements-inherit': 'entitlements.plist',
      verbose: true,
      'gatekeeper-assess': false,
      optionsForFile: (filePath) => {
        return {
          entitlements: 'entitlements.plist'
        };
      }
    },
    osxNotarize: {
      appleApiKey: process.env.MACOS_NOTARYTOOL_API_KEY,
      appleApiKeyId: process.env.MACOS_NOTARYTOOL_API_KEY_ID,
      appleApiIssuer: process.env.MACOS_NOTARYTOOL_API_KEY_ISSUER_ID,
      teamId: process.env.MACOS_NOTARIZATION_TEAM_ID
    }
  },
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
        devContentSecurityPolicy: "default-src *  data: blob: filesystem: about: ws: wss: 'unsafe-inline' 'unsafe-eval'; script-src * data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src * data: blob: 'unsafe-inline'; img-src * data: blob: media: 'unsafe-inline'; frame-src * data: blob: ; style-src * data: blob: 'unsafe-inline'; font-src * data: blob: 'unsafe-inline'; frame-ancestors * ;",
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
