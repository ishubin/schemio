import { List } from "./list";

export function jsObjectToSchemioScript(obj) {
    if (!obj) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return new List(...obj.map(jsObjectToSchemioScript));
    }

    if (typeof obj === 'object') {
        const converted = {};
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                converted[key] = jsObjectToSchemioScript(obj[key]);
            }
        }
        return converted;
    }

    return obj;
}


export function schemioScriptObjectToJS(obj) {
    if (!obj) {
        return obj;
    }
    if (obj instanceof List) {
        return obj.items.map(schemioScriptObjectToJS);
    }
    if (Array.isArray(obj)) {
        return obj.map(schemioScriptObjectToJS);
    }
    if (typeof obj === 'object') {
        const converted = {};
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                converted[key] = schemioScriptObjectToJS(obj[key]);
            }
        }
        return converted;
    }
    return obj;
}