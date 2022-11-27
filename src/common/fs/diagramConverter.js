import forEach from 'lodash/forEach';

/**
 * 
 * @param {string} imageUrl 
 * @param {Object} imagePrefixConversions 
 * @returns 
 */
function fixImageUrl(imageUrl, imagePrefixConversions) {
    for (let prefix in imagePrefixConversions) {
        if (imagePrefixConversions.hasOwnProperty(prefix) && imageUrl.startsWith(prefix)) {
            const newPrefix = imagePrefixConversions[prefix];
            const newUrl = newPrefix + imageUrl.substring(prefix.length);
            return newUrl;
        }
    }

    return imageUrl;
}


/**
 *
 * @param {*} originalDiagram
 * @param {Object} imagePrefixConversions
 * @returns
 */
export function convertDiagram(originalDiagram, imagePrefixConversions) {
    const diagram = JSON.parse(JSON.stringify(originalDiagram));

    traverseItems(diagram.items, item => {
        if (item.shapeProps) {
            if (item.shape === 'image') {
                item.shapeProps.image = fixImageUrl(item.shapeProps.image, imagePrefixConversions);
            } else if (item.shapeProps.fill && typeof item.shapeProps.fill === 'object' && item.shapeProps.fill.image) {
                item.shapeProps.fill.image = fixImageUrl(item.shapeProps.fill.image, imagePrefixConversions);
            }
        }
        if (item.behavior && item.behavior.events) {
            forEach(item.behavior.events, behaviorEvent => {
                forEach(behaviorEvent.actions, action => {
                    forEach(action.args, (arg, argName) => {
                        if (argName === 'fill' && typeof arg === 'object' && arg.image) {
                            arg.image = fixImageUrl(arg.image, imagePrefixConversions);
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