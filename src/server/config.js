
function configVar(envVarName, defaultValue) {
    if (process.env.hasOwnProperty(envVarName)) {
        return process.env[envVarName];
    }
    return defaultValue;
}

export function loadConfig() {
    return {
        fs: {
            rootPath: configVar('FS_ROOT_PATH', '/opt/schemio/')
        },

        serverPort: configVar('SERVER_PORT', 4010),

        fileUploadMaxSize: configVar('FILE_UPLOAD_MAX_SIZE', 10 * 1024 * 1024)
    };
}