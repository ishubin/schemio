/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { forEach, map } from './collections';
import { encode } from 'js-base64';

function leadingZero(number) {
    if (number < 10) {
        return '0' + number;
    } else {
        return '' + number;
    }
}

function sanitizeItem(oldItem) {
    let item = {};
    forEach(oldItem, (value, field) => {
        if (field === 'childItems') {
            item[field] = map(value, sanitizeItem);
        } else if (field !== 'meta' && field !== '_childItems') {
            item[field] = value;
        }
    });
    return item;
}

const _defaultScripts = {
    main: {
        source: ''
    },
    functions: []
};

function sanitizeScheme(scheme) {
    const items = map(scheme.items, sanitizeItem);
    return {
        id: scheme.id,
        name: scheme.name,
        description: scheme.description,
        tags: scheme.tags,
        modifiedTime: scheme.modifiedTime,
        scripts: scheme.scripts || _defaultScripts,
        items: items,
        style: scheme.style || {}
    }
}

function formatDateAndTime(dateInMillis) {
    var d = new Date(dateInMillis);
    return `${leadingZero(d.getFullYear())}.${leadingZero(d.getMonth())}.${leadingZero(d.getDate())} ${leadingZero(d.getHours())}:${leadingZero(d.getMinutes())}`;
}

function clone(obj) {
    if (typeof obj === 'undefined' || obj === null) {
        return null;
    }
    return JSON.parse(JSON.stringify(obj));
}

function extendObject(originalObject, overrideObject) {
    forEach(overrideObject, (value, key) => {
        if (!originalObject.hasOwnProperty(key)) {
            originalObject[key] = clone(value);
        } else {
            if (typeof value === 'object') {
                extendObject(originalObject[key], value);
            }
        }
    });
    return originalObject;
}


/**
 * 
 * @param {object} obj 
 * @param {string|Array} propertyPath - a dot separated path to a property inside a given object
 */
function getObjectProperty(item, propertyPath) {
    if (item) {
        let objectPath = null;
        if (Array.isArray(propertyPath)) {
            objectPath = propertyPath;
        } else {
            objectPath = propertyPath.split('.');
        }
        let field = item;
        let i = 0;
        while(i < objectPath.length) {
            const fieldName = objectPath[i].trim();
            if (fieldName) {
                if (i < objectPath.length - 1) {
                    field = field[fieldName];
                    if (typeof field !== 'object') {
                        // not doing anything since there is a conflict
                        return undefined;
                    }
                } else {
                    // this is the lowest nested property
                    if (field.hasOwnProperty(fieldName)) {
                        return field[fieldName];
                    }
                }
            } else {
                //Probably an error
                return undefined;
            }
            i += 1;
        }
    }
    return undefined;
}

/**
 *
 * @param {Object} obj
 * @param {String|Array} propertyPath either encoded property path in string or an array of fields
 * @param {*} value
 * @returns
 */
function setObjectProperty(obj, propertyPath, value) {
    changeObjectProperty(obj, propertyPath, value, false);
}

/**
 *
 * @param {Object} obj
 * @param {String|Array} propertyPath
 * @param {*} value
 * @param {Boolean} shouldDelete
 * @returns
 */
function changeObjectProperty(obj, propertyPath, value, shouldDelete) {
    let objectPath = null;
    if (Array.isArray(propertyPath)) {
        objectPath = propertyPath;
    } else {
        objectPath = propertyPath.split('.');
    }

    let field = obj;
    let i = 0;
    while(i < objectPath.length) {
        const fieldName = objectPath[i].trim();
        if (fieldName) {
            if (i < objectPath.length - 1) {
                if (!field.hasOwnProperty(fieldName)) {
                    field[fieldName] = {};
                }
                field = field[fieldName];
                if (typeof field !== 'object') {
                    // not doing anything since there is a conflict
                    return;
                }
            } else {
                // this is the lowest nested property
                if (shouldDelete && field.hasOwnProperty(fieldName)) {
                    delete field[fieldName];
                } else {
                    field[fieldName] = value;
                }
                return;
            }
        } else {
            //Probably an error, so return and don't do anything.
            return;
        }
        i += 1;
    }
}

function deleteObjectProperty(obj, propertyPath) {
    changeObjectProperty(obj, propertyPath, null, true);
}

function rotatePointAroundCenter(px, py, angle, cx, cy) {
    const vx = px - cx;
    const vy = py - cy;
    const rotated = rotateVector(vx, vy, angle);

    return {
        x: cx + rotated.x,
        y: cy + rotated.y
    };
}

function rotateVector(x, y, angle) {
    const cs = Math.cos(angle * Math.PI / 180); 
    const sn = Math.sin(angle * Math.PI / 180);
    return {
        x: x * cs - y * sn,
        y: x * sn + y * cs
    };
}

function enumerateConstants(obj) {
    const props = [];
    for (let key in obj) {
        // checking if property is all uppercase
        if (obj.hasOwnProperty(key) && key === key.toUpperCase()) {
            props.push(obj[key]);
        }
    }
    return props;
}

function domHasParentNode(domElement, callbackCheck) {
    if (callbackCheck(domElement)) {
        return true;
    };
    if (domElement.parentElement) {
        return domHasParentNode(domElement.parentElement, callbackCheck);
    }
    return false;
}

function domFindAncestorByClassUntil(domElement, cssClass, stopCallback) {
    if (domElement.classList.contains(cssClass)) {
        return domElement;
    }

    if (stopCallback) {
        if (stopCallback(domElement)) {
            return null;
        }
    }

    if (domElement.parentElement) {
        return domFindAncestorByClassUntil(domElement.parentElement, cssClass, stopCallback);
    }
    return null;
}


function forceDownload(fileName, contentType, content) {
    const dataUrl = `data:${contentType};base64,${encode(content)}`;

    const link = document.createElement('a');
    document.body.appendChild(link);

    try {
        link.href = dataUrl;
        link.download = fileName;
        link.click();
    } catch(e) {
        console.error(e);
    }
    setTimeout(() => document.body.removeChild(link), 100);
}


/**
 * Compares two objects for deep equality
 * @param {*} v1 
 * @param {*} v2 
 */
function equals(v1, v2) {
    const t1 = typeof v1;
    const t2 = typeof v2;
    if (t1 !== t2) {
        return false;
    }

    if (Array.isArray(v1)) {
        if (v1.length !== v2.length) {
            return false;
        }
        for (let i = 0; i < v1.length; i++) {
            if (!equals(v1[i], v2[i])) {
                return false;
            }
        }
        return true;
    } else if (t1 === 'object') {
        for (let key in v1) {
            if (v1.hasOwnProperty(key)) {
                if (!equals(v1[key], v2[key])) {
                    return false;
                }
            }
        }

        for (let key in v2) {
            if (!v1.hasOwnProperty(key)) {
                return false;
            }
        }

        return true;
    }
    return v1 === v2;
}

function hashString(text) {
    let hash = 0;

    if (text.length == 0) {
        return hash;
    }

    for (let i = 0; i < text.length; i++) {
        let symbol = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + symbol;
        hash = hash & hash;
    }

    return hash;
}


export default {
    formatDateAndTime,
    clone,
    extendObject,
    sanitizeScheme,
    getObjectProperty,
    setObjectProperty,
    deleteObjectProperty,
    rotateVector,
    rotatePointAroundCenter,
    enumerateConstants,
    domHasParentNode,
    domFindAncestorByClassUntil,
    forceDownload,
    equals,
    hashString
};
