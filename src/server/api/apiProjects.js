
const projectStorage = require('../storage/storageProvider.js').provideProjectStorage();
const _ = require('lodash');

const ApiProjects = {
    createProject(req, res) {
        const project = req.body;
        if (project.name) {
            // sepcifying access rights
            project.write = [req.session.userLogin];
            project.read = [req.session.userLogin];
            projectStorage.createProject(project)
            .then(project => res.json(project))
            .catch(err => {
                if (typeof err === 'string' && err.indexOf('duplicate') >=0 && err.indexOf('name_1') >=0) {
                    res.$apiError(err, `Project "${project.name}" already exists`);
                } else {
                    res.$apiError(err, 'Something went wrong, was not able to create a project');
                }
            });
        } else {
            res.$apiError('Project name should not be empty');
        }
    },

    findProjects(req, res) {
        const query = {
            query: req.query.q ? req.query.q.trim() : null,
            includeParent: false
        };

        if (req.session.userLogin) {
            query.userLogin = req.session.userLogin;
        }

        if (req.query.offset && req.query.offset.length > 0) {
            query.offset = parseInt(req.query.offset);
        }

        projectStorage.findProjects(query).then(searchResult => {
            res.json(searchResult);
        }).catch(err => res.$apiError(err));
    },

    getProject(req, res) {
        const projectId = req.params.projectId;
        const userLogin = req.session.userLogin;
        projectStorage.getProject(projectId, userLogin)
        .then(project => {
            if (project) {
                const projectResponse = {
                    id:             project.id,
                    name:           project.name,
                    description:    project.description,
                    createdDate:    project.createdDate,
                    isPublic:       project.isPublic,
                    permissions: {
                        read:   true,
                        write:  false,
                    }
                };
                if (userLogin && _.indexOf(project.write, userLogin) >= 0) {
                    projectResponse.permissions.write = true;
                }
                res.json(projectResponse);
            } else {
                return Promise.reject('Not authorized');
            }
        })
        .catch(err => res.$apiError(err));
    },

    /**
     * Patches project. Currently only "update" operation is supported and only for the following fields:
     *   - name
     * Payload should be of the following format: [{op: "update", field: "name", value: "Blah"}]
     * @param {*} req 
     * @param {*} res 
     */
    patchProject(req, res) {
        const projectId = req.params.projectId;
        const userLogin = req.session.userLogin;
        const operations = req.body;

        const supportedUpdateFields = {
            name: 'string',
            description: 'string',
            isPublic: 'boolean'
        };

        const fields = {};
        _.forEach(operations, operation => {
            const fieldType = supportedUpdateFields[operation.field];
            if (operation && operation.op === 'update' && fieldType) {
                if (fieldType === 'string') {
                    fields[operation.field] = '' + operation.value;
                } else if (fieldType === 'boolean') {
                    if (operation.value && operation.value !== 'false') {
                        fields[operation.field] = true;
                    } else {
                        fields[operation.field] = false;
                    }
                }
            } 
        });

        projectStorage.getProject(projectId, userLogin)
        .then(project => {
            if (project) {
                if (userLogin && _.indexOf(project.write, userLogin) >= 0) {
                    return project;
                }
            }
            return Promise.reject('Not authorized to update project');
        })
        .then(() => {
            return projectStorage.updateProject(projectId, fields);
        })
        .then(() => res.json({status: 'ok'}))
        .catch(err => res.$apiError(err));
    },

    deleteProject(req, res) {
        const projectId = req.params.projectId;
        const userLogin = req.session.userLogin;

        projectStorage.getProject(projectId, userLogin)
        .then(project => {
            if (project) {
                if (userLogin && _.indexOf(project.write, userLogin) >= 0) {
                    return project;
                }
            }
            return Promise.reject('Not authorized to delete this project');
        })
        .then(() => {
            return projectStorage.deleteProject(projectId);
        })
        .then(() => res.json({status: 'ok'}))
        .catch(err => res.$apiError(err));
    }
};

module.exports = ApiProjects;