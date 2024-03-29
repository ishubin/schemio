/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

function configVar(envVarName, defaultValue) {
    if (process.env.hasOwnProperty(envVarName)) {
        return process.env[envVarName];
    }
    return defaultValue;
}

function configNumberVar(varName, defaultValue) {
    if (process.env.hasOwnProperty(varName)) {
        return parseInt(process.env[varName]);
    }
    return defaultValue;
}

function configBoolVar(varName, defaultValue) {
    if (process.env.hasOwnProperty(varName)) {
        return process.env[varName] === 'true';
    }
    return defaultValue;
}

export function loadConfig() {
    return {
        fs: {
            rootPath: configVar('FS_ROOT_PATH', '/opt/schemio/')
        },

        serverPort: configNumberVar('SERVER_PORT', 4010),

        fileUploadMaxSize: configNumberVar('FILE_UPLOAD_MAX_SIZE', 10 * 1024 * 1024),

        viewOnlyMode: configBoolVar('VIEW_ONLY_MODE', false)
    };
}