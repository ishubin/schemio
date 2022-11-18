import { ObjectService } from "./objectService";

const artObjectService = new ObjectService('.art.json');

const artService = {
    create(fileIndex, name, url) {
        return artObjectService.create(fileIndex.rootPath, {name, url});
    },


    getAll(fileIndex) {
        return artObjectService.getAll(fileIndex.rootPath);
    },

    save(fileIndex, artId, name, url) {
        return artObjectService.save(fileIndex.rootPath,  artId, {name, url});
    },

    delete(fileIndex, artId) {
        return artObjectService.delete(fileIndex.rootPath,  artId);
    }
};

export default artService;