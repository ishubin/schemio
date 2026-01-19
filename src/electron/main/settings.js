import { mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const homeDir = homedir();
const schemioDir = join(homeDir, '.schemio');
const settingsPath = join(schemioDir, 'settings.json');

const defaultSettings = {
    theme: 'light',
};


export function saveUserSettings(settings) {
    return mkdir(schemioDir, { recursive: true })
    .then(() => {
        return writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    })
    .then(() => {
        console.log(`Settings saved to ${settingsPath}`);
        return settingsPath;
    });
}


export function loadUserSettings() {
    return readFile(settingsPath, 'utf8')
    .then((data) => {
        const settings = JSON.parse(data);
        console.log(`Settings loaded from ${settingsPath}`);
        return settings;
    })
    .catch((error) => {
        if (error.code === 'ENOENT') {
            console.log('Settings file not found, using defaults');
        } else {
            console.error('Error loading settings:', error.message);
        }
        return defaultSettings;
    });
}

