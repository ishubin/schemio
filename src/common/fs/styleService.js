import { ObjectService } from "./objectService";

const styleObjectService = new ObjectService('.styles.json');

const styleService = {
    create(projectPath, fill, strokeColor, textColor) {
        return styleObjectService.create(projectPath, {fill, strokeColor, textColor});
    },

    getAll(projectPath) {
        return styleObjectService.getAll(projectPath);
    },

    delete(projectPath, styleId) {
        return styleObjectService.delete(projectPath, styleId);
    }
};

export default styleService;
