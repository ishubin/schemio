import utils from "../utils";
import { traverseItems } from "./Item";

const schemeBasicFields = ['name', 'description', 'tags', 'style', 'settings'];

export function rebaseScheme(scheme, latestScheme) {
    schemeBasicFields.forEach(fieldName => {
        replaceObjectIfDiffer(scheme, latestScheme, fieldName);
    });

    const itemMetas = new Map();

    traverseItems(scheme.items, item => {
    });

    traverseItems(latestScheme.items, item => {
        const meta = itemMetas.get(item.id);
        if (meta) {
            item.meta = utils.clone(meta);
        }
    })

    scheme.items = utils.clone(latestScheme.items);
}

function replaceObjectIfDiffer(origin, modified, fieldName) {
    const originHasField = origin.hasOwnProperty(fieldName);
    const modifiedHasField = modified.hasOwnProperty(fieldName);

    if (modifiedHasField) {
        if (originHasField) {
            const originJSON = JSON.stringify(origin[fieldName]);
            const modifiedJSON = JSON.stringify(modified[fieldName]);
            if (originJSON !== modifiedJSON) {
                origin[fieldName] = JSON.parse(modifiedJSON);
            }
        } else {
            origin[fieldName] = modified[fieldName];
        }
    } else if (originHasField) {
        delete origin[fieldName];
    }
}