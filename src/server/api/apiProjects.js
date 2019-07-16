
const projectStorage = require('../storage/storageProvider.js').provideProjectStorage();

const ApiProjects = {
    createProject(req, res) {
        const project = req.body;
        if (project.name) {
            projectStorage.createProject(project).then(project => res.json(project)).catch(err => res.$apiError(err, 'Could not store project'));
        } else {
            res.$apiError('Project name should not be empty');
        }
    }

};

module.exports = ApiProjects;