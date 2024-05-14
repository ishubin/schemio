import { List } from "./list";
import { Vector } from "./vector";

/**
 * Converts any object and its nested items to JSON object
 * It converts Map or Vector types to Object and List to Array
 * @param {any} obj
 */
export function convertScriptObjectToJSON(obj) {
    if (obj instanceof Map) {
        return convertMapToJSON(obj);
    } else if (obj instanceof List || Array.isArray(obj)) {
        return convertListToJSON(obj)
    } else if (obj instanceof Vector) {
        return convertVectorToJSON(obj);
    }

    const type = typeof obj;
    if (type === 'string' || type === 'number' || type === 'boolean' || type === 'bigint') {
        return obj;
    }
    if (obj === null || obj === undefined) {
        return null
    }

    if (type === 'object') {
        return convertObjectToJSON(obj);
    }

    return null;
}

/**
 * @param {List} list
 * @returns {Array}
 */
function convertListToJSON(list) {
    const result = [];
    list.forEach(item => {
        result.push(convertScriptObjectToJSON(item));
    })
    return result;
}

/**
 * @param {Vector} vector
 * @returns
 */
function convertVectorToJSON(vector) {
    return {
        x: vector.x,
        y: vector.y
    };
}

/**
 * @param {Map} obj
 * @returns {Object}
 */
function convertMapToJSON(obj) {
    const result = {};
    obj.forEach((value, key) => {
        result[key] = convertScriptObjectToJSON(value);
    });
    return result;
}


function convertObjectToJSON(obj) {
    const result = {};
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            result[key] = convertScriptObjectToJSON(obj[key]);
        }
    }
    return result;
}



export function convertJSONToScriptObject(obj) {
    if (obj === null) {
        return null;
    }

    if (Array.isArray(obj)) {
        return convertArrayToList(obj);
    } else if (typeof obj === 'object') {
        return convertJSONObjectToMap(obj);
    }
    return obj;
}

/**
 * @param {Array} arr
 */
function convertArrayToList(arr) {
    return new List(...arr.map(convertJSONToScriptObject));
}

function convertJSONObjectToMap(obj) {
    const m = new Map();
    for(let key in obj) {
        if (obj.hasOwnProperty(key)) {
            m.set(key, convertJSONToScriptObject(obj[key]));
        }
    }
    return m;
}