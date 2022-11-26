import path from 'path';

const storage = require('electron-json-storage');


console.log('Storage data path', storage.getDataPath());


const RECENT_OPEN_PROJECTS = 'recentOpenProjects';

export function storeOpenProject(projectPath) {
    return new Promise((resolve) => {
        storage.get(RECENT_OPEN_PROJECTS, (err, recentOpenProjects) => {
            if (err || !recentOpenProjects) {
                recentOpenProjects = {};
            }

            recentOpenProjects[projectPath] = {
                name: path.basename(projectPath),
                lastOpen: new Date()
            };

            storage.set(RECENT_OPEN_PROJECTS, recentOpenProjects);
        });
    });
}

export function getLastOpenProjects(event) {
    return new Promise((resolve, reject) => {
        storage.get(RECENT_OPEN_PROJECTS, (err, recentOpenProjects ) => {
            if (!recentOpenProjects || err) {
                resolve([]);
                return;
            }

            const projects = [];

            for(let projectPath in recentOpenProjects) {
                if (recentOpenProjects.hasOwnProperty(projectPath)) {
                    const entry = recentOpenProjects[projectPath];
                    projects.push({
                        name: entry.name,
                        path: projectPath,
                        lastOpen: entry.lastOpen
                    });
                }
            }

            projects.sort((a, b) => {
                const aTime = new Date(a.lastOpen).getTime();
                const bTime = new Date(b.lastOpen).getTime();

                if (aTime < bTime) {
                    return 1;
                }
                if (aTime > bTime) {
                    return -1;
                }

                return 0;
            });
            resolve(projects);
        });
    });
}

export function forgetLastOpenProject(event, projectPath) {
    return new Promise((resolve, reject) => {
        storage.get(RECENT_OPEN_PROJECTS, (err, recentOpenProjects ) => {
            if (!recentOpenProjects || err) {
                resolve();
                return;
            }

            for(let storedPath in recentOpenProjects) {
                if (recentOpenProjects.hasOwnProperty(storedPath) && storedPath === projectPath) {
                    delete recentOpenProjects[projectPath];
                    storage.set(RECENT_OPEN_PROJECTS, recentOpenProjects);
                    break;
                }
            }

            resolve();
        });
    });
}