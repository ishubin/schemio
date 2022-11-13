export function electronAPICLient() {
    return {
        uploadFile(file) {
            return window.electronAPI.copyFileToProjectMedia(file.path, file.name);
        }
    };
}