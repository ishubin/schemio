
const projectStorage = require('../storage/storageProvider.js').provideProjectStorage();

const ApiProjects = {
    createProject(req, res) {
        const project = req.body;
        if (project.name) {
            // sepcifying access rights
            project.write = [req.session.userLogin];
            project.read = [req.session.userLogin];
            projectStorage.createProject(project).then(project => res.json(project)).catch(err => res.$apiError(err, 'Could not store project'));
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
    }

};

module.exports = ApiProjects;