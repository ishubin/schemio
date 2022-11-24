import forEach from 'lodash/forEach';

function fixImageUrl(imageUrl, mediaPrefixFrom, mediaPrefixTo) {
    if (imageUrl.startsWith(mediaPrefixFrom)) {

        const newUrl = mediaPrefixTo + imageUrl.substring(mediaPrefixFrom.length);
        return newUrl;
    }
    return imageUrl;
}


export function convertDiagram(originalDiagram, mediaPrefixFrom, mediaPrefixTo) {
    const diagram = JSON.parse(JSON.stringify(originalDiagram));

    traverseItems(diagram.items, item => {
        if (item.shapeProps) {
            if (item.shape === 'image') {
                item.shapeProps.image = fixImageUrl(item.shapeProps.image, mediaPrefixFrom, mediaPrefixTo);
            } else if (item.shapeProps.fill && typeof item.shapeProps.fill === 'object' && item.shapeProps.fill.image) {
                item.shapeProps.fill.image = fixImageUrl(item.shapeProps.fill.image, mediaPrefixFrom, mediaPrefixTo);
            }
        }
        if (item.behavior && item.behavior.events) {
            forEach(item.behavior.events, behaviorEvent => {
                forEach(behaviorEvent.actions, action => {
                    forEach(action.args, (arg, argName) => {
                        if (argName === 'fill' && typeof arg === 'object' && arg.image) {
                            arg.image = fixImageUrl(arg.image, mediaPrefixFrom, mediaPrefixTo);
                        }
                    });
                });
            });
        }

    });
    return diagram;
}

function traverseItems(items, callback) {
    forEach(items, item => {
        callback(item);
        if (item.childItems) {
            traverseItems(item.childItems, callback);
        }
    })
}