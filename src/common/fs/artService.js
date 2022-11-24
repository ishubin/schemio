import { ObjectService } from "./objectService";

const artObjectService = new ObjectService('.art.json');

const artService = {
    create(projectPath, name, url) {
        return artObjectService.create(projectPath, {name, url});
    },

    getAll(projectPath) {
        return artObjectService.getAll(projectPath);
    },

    save(projectPath, artId, name, url) {
        return artObjectService.save(projectPath,  artId, {name, url});
    },

    delete(projectPath, artId) {
        return artObjectService.delete(projectPath,  artId);
    }
};

export default artService;