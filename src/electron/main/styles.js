import styleService from "../../common/fs/styleService"

const fsMediaPrefix = '/media/';
const electronMediaPrefix = 'media://local/';

export function createStyle(contextHolder) {
    return (event, fill, strokeColor, textColor) => {
        const fileIndex = contextHolder.from(event).fileIndex;
        return styleService.create(fileIndex, fill, strokeColor, textColor);
    }
}

export function deleteStyle(contextHolder) {
    return (event, styleId) => {
        const fileIndex = contextHolder.from(event).fileIndex;
        return styleService.delete(fileIndex, styleId);
    }
}

export function getStyles(contextHolder) {
    return (event) => {
        const fileIndex = contextHolder.from(event).fileIndex;
        return styleService.getAll(fileIndex)
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