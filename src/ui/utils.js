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
    var items = _.map(scheme.items, sanitizeItem);
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
}

module.exports = {
    formatDateAndTime,
    clone,
    extendObject,
    sanitizeScheme
};
