import styleService from "../../common/fs/styleService"

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
        return styleService.getAll(fileIndex);
    }
}