/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

function leadingZero(number) {
    if (number < 10) {
        return '0' + number;
    } else {
        return '' + number;
    }
}

function sanitizeItem(oldItem) {
    var item = {};
    _.forEach(oldItem, (value, field) => {
        if (field === 'connectors') {
            item.connectors = _.map(value, sanitizeConnector);
        } else if (field !== 'meta') {
            item[field] = value;
        }
    });
    return item;
}
function sanitizeConnector(oldConnector) {
    var connector = {};
    _.forEach(oldConnector, (value, field) => {
        if (field !== 'meta') {
            connector[field] = value;
        }
    });
    return connector;
}


function sanitizeScheme(scheme) {
    const items = _.map(scheme.items, sanitizeItem);
    return {
        id: scheme.id,
        name: scheme.name,
        description: scheme.description,
        tags: scheme.tags,
        modifiedDate: scheme.modifiedDate,
        categoryId: scheme.categoryId,
        items: items
    }
}

function formatDateAndTime(dateInMillis) {
    var d = new Date(dateInMillis);
    return `${leadingZero(d.getFullYear())}.${leadingZero(d.getMonth())}.${leadingZero(d.getDate())} ${leadingZero(d.getHours())}:${leadingZero(d.getMinutes())}`;
}

function clone(obj) {
    if (obj === undefined && obj === null) {
        return null;
    }
    return JSON.parse(JSON.stringify(obj));
}

function extendObject(originalObject, overrideObject) {
    _.forEach(overrideObject, (value, key) => {
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
 * @param {string} propertyPath - a dot separated path to a property inside a given object
 */
function getObjectProperty(item, propertyPath) {
    if (item) {
        const objectPath = propertyPath.split('.');
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

function setObjectProperty(obj, propertyPath, value) {
    const objectPath = propertyPath.split('.');
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
                if (field.hasOwnProperty(fieldName) && typeof field[fieldName] === 'object') {
                    // should not change in case the field is actually an object
                    return;
                }
                field[fieldName] = value;
                return;   
            }
        } else {
            //Probably an error, so return and don't do anything.
            return;
        }
        i += 1;
    }
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


module.exports = {
    formatDateAndTime,
    clone,
    extendObject,
    sanitizeScheme,
    getObjectProperty,
    setObjectProperty,
    rotateVector,
    rotatePointAroundCenter
};
