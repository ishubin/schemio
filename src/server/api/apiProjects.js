
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
        .catch(res.$apiError);
    }

};

module.exports = ApiProjects;