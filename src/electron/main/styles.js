import styleService from "../../common/fs/styleService"

const fsMediaPrefix = '/media/';
const electronMediaPrefix = 'media://local/';

export function createStyle(contextHolder) {
    return (event, fill, strokeColor, textColor) => {
        const projectPath = contextHolder.from(event).projectPath;
        return styleService.create(projectPath, fill, strokeColor, textColor);
    }
}

export function deleteStyle(contextHolder) {
    return (event, styleId) => {
        const projectPath = contextHolder.from(event).projectPath;
        return styleService.delete(projectPath, styleId);
    }
}

export function getStyles(contextHolder) {
    return (event) => {
        const projectPath = contextHolder.from(event).projectPath;
        return styleService.getAll(projectPath)
        .then(styles => {
            if (Array.isArray(styles)) {
                styles.forEach(style => {
                    if (style && style.fill && style.fill.image && style.fill.image.startsWith(fsMediaPrefix)) {
                        style.fill.image = electronMediaPrefix + style.fill.image.substring(fsMediaPrefix.length);
                    }
                })
            };
            return styles;
        });
    }
}