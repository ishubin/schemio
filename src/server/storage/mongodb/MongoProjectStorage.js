const shortid           = require('shortid');
const mongo             = require('./Mongo.js');
const _                 = require('lodash');

const CURRENT_PROJECT_VERSION = 1;
const RESULTS_PER_PAGE = 20;

class MongoProjectStorage {
    _projects() {
        return mongo.db().collection('projects');
    }


    createProject(project) {
        const newProject = {
            id: shortid.generate(),
            version: CURRENT_PROJECT_VERSION,
            name: '' + project.name,
            description: project.description || '',
            createdTime: new Date().toISOString(),
            read: project.read,
            write: project.write,
            isPublic: project.isPublic ? true: false,
            owner: project.owner
        };

        return this._projects().insertOne(newProject)
        .then(result => newProject)
        .catch(err => Promise.reject(err.errmsg));
    }


    /**
     * Retrieves the project only in case the user is authorized
     * @param {string} projectId 
     * @param {string} userLogin 
     */
    getProject(projectId, userLogin) {
        const $or = [{isPublic: true}];
        if (userLogin) {
            $or.push({read: userLogin});
        }

        return this._projects().findOne({
            id: projectId,
            $or: $or
        });
    }

    /**
     * 
     * @param {*} projectId 
     * @param {*} projectFields 
     * @param {*} extras
     */
    updateProject(projectId, projectFields, extras) {
        const fields = {};
        let isNotEmpty = false;
        if (projectFields.name) {
            fields.name = projectFields.name;
            isNotEmpty = true;
        }
        if (projectFields.description) {
            fields.description = projectFields.description;
            isNotEmpty = true;
        }
        if (projectFields.hasOwnProperty('isPublic')) {
            fields.isPublic = projectFields.isPublic;
            isNotEmpty = true;
        }

        if (extras && extras.owner) {
            fields.owner = extras.owner;
        }
        
        if (isNotEmpty) {
            return this._projects().updateOne({ id: projectId }, { $set: fields });
        } else {
            return Promise.reject('Missing valid fields');
        }
    }


    /**
     * Checks whether user has read rights for specified project
     * @param {string} projectId 
     * @param {string} userLogin 
     * @returns {Promise} boolean if the user is authorized to read
     */
    isUserAuthorizedToRead(projectId, userLogin) {
        return this._projects().find({
            id: projectId,
            $or: [{
                isPublic: true
            }, {
                read: userLogin
            }]
        }).limit(1).count().then(size => size === 1? true: false);
    }

    /**
     * Checks whether user has write rights for specified project
     * @param {string} projectId 
     * @param {string} userLogin 
     * @returns {Promise} boolean if the user is authorized to write
     */
    isUserAuthorizedToWrite(projectId, userLogin) {
        return this._projects().find({
            id: projectId,
            write: userLogin
        }).limit(1).count().then(size => size === 1? true: false);
    }
    
    /**
     * Finds all projects either public or the ones the user is authorized to read
     */
    findProjects(query) {
        const mongoQuery = {
            $or: [{
                isPublic: true
            }],
        };

        if (query.userLogin) {
            mongoQuery.$or.push({
                read: query.userLogin
            })
        }

        if (query.query && query.query.length > 0) {
            mongoQuery['$text'] = {'$search': mongo.sanitizeString(query.query)};
        }

        let offset = 0;
        if (query.offset) {
            offset = parseInt(query.offset);
        }
        let limit = RESULTS_PER_PAGE;

        return Promise.all([
            this._projects().count(mongoQuery),
            this._projects().find(mongoQuery).skip(offset).limit(limit).toArray()
        ]).then(values => {
            let count = values[0];
            let projects = values[1];
            return {
                results: _.map(projects, project => {
                    return {
                        id: project.id,
                        name: project.name,
                        description: project.description,
                        createdTime: project.createdTime,
                        isPublic:       project.isPublic,
                        owner: project.owner
                    };
                }),
                total: count,
                resultsPerPage: limit,
                offset: 0
            };
        });
    }

    /**
     * Deletes project and all of its related collections
     * This function is very bad and it should be implemented differently.
     * Instead of deleting everything inside of a single user request session, it should mark the project as deleted.
     * Later on the deletion of everything that is related to the project and deletion of project itself should be picked
     * up by a background scheduled job.
     * But to implement background job we need to think about the following job locking when multiple instances of app are deployed
     * 
     * @param {String} projectId
     */
    deleteProject(projectId) {
        //TODO Implemented background scheduled job for deletion of projects and related collections

        //TODO Figure out how to delete all project files, probably this is something that can only be done in a background job

        const collections = [
            'art',
            'schemes',
            'schemePreviews',
            'tags',
            'categories'
        ];

        return Promise.all(_.map(collections, collectionName => {
            return mongo.db().collection(collectionName).deleteOne({ projectId: mongo.sanitizeString(projectId) });
        }))
        .then(() => {
            return this._projects().deleteOne({id: mongo.sanitizeString(projectId)});
        });
    }
}


module.exports = MongoProjectStorage;