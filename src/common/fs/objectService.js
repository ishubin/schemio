import { nanoid } from "nanoid";
const path = require('path');
const fs = require('fs-extra');

export class ObjectService {
    constructor(relativeIndexPath) {
        this.relativeIndexPath = relativeIndexPath;
    }


    create(projectPath, obj) {
        obj.id = nanoid();

        const objFile = path.join(projectPath, this.relativeIndexPath);

        return fs.stat(objFile)
        .catch(err => {
            return fs.writeFile(objFile, '[]');
        })
        .then(() => {
            return fs.readFile(objFile, 'utf-8');
        })
        .then(content => {
            try {
                return JSON.parse(content);
            } catch(err) {
                return [];
            }
        })
        .then(existingObj => {
            existingObj.push(obj);
            return fs.writeFile(objFile, JSON.stringify(existingObj));
        })
        .then(() => {
            return obj;
        });
    }

    save(projectPath, objId, data) {
        const objFile = path.join(projectPath, this.relativeIndexPath);

        return this.getAll(projectPath)
        .then(items => {
            for (let i = 0; i < items.length; i++) {
                if (items[i].id === objId) {
                    items[i] = {
                        ...data,
                        id: objId
                    };
                    return fs.writeFile(objFile, JSON.stringify(items));
                }
            }
            return null;
        });
    }

    delete(projectPath, objId) {
        const objFile = path.join(projectPath, this.relativeIndexPath);

        return this.getAll(projectPath)
        .then(items => {
            for (let i = 0; i < items.length; i++) {
                if (items[i].id === objId) {
                    items.splice(i, 1);
                    return fs.writeFile(objFile, JSON.stringify(items));
                }
            }
            return null;
        });
    }

    getAll(projectPath) {
        const objectsFile = path.join(projectPath, this.relativeIndexPath);
        return fs.readFile(objectsFile).then(content => {
            return JSON.parse(content);
        });
    }
}