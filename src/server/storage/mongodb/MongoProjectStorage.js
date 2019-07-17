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
            name: '' + project.name,
            description: project.description || '',
            createdDate: Date.now(),
            read: project.read,
            write: project.write,
            isPublic: project.isPublic ? true: false
        };

        return this._projects().insertOne(newProject).then(result => newProject);
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
            $or: [{
                isPublic: true
            }, {
                write: userLogin
            }]
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
                        createdDate: project.createdDate
                    };
                }),
                total: count,
                resultsPerPage: limit,
                offset: 0
            };
        });
    }
}


module.exports = MongoProjectStorage;