const shortid           = require('shortid');
const mongo             = require('./Mongo.js');

const CURRENT_PROJECT_VERSION = 1;


class MongoProjectStorage {
    _projects() {
        return mongo.db().collection('projects');
    }


    createProject(project) {
        const newProject = {
            id: shortid.generate(),
            name: '' + project.name,
            description: project.description || '',
            isPublic: project.isPublic ? true: false
        };

        return this._projects().insertOne(newProject).then(result => newProject);
    }
}


module.exports = MongoProjectStorage;