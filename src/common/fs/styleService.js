import { ObjectService } from "./objectService";

const styleObjectService = new ObjectService('.styles.json');

const styleService = {
    create(fileIndex, fill, strokeColor, textColor) {
        return styleObjectService.create(fileIndex.rootPath, {fill, strokeColor, textColor});
    },

    getAll(fileIndex) {
        return styleObjectService.getAll(fileIndex.rootPath);
    },

    delete(fileIndex, styleId) {
        return styleObjectService.delete(fileIndex.rootPath, styleId);
    }
};

export default styleService;
