/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
const sanitizeHtml = require('sanitize-html');

export default function (html) {
    const fixed = html.replaceAll(/<p><\/p>/g, '<p>&nbsp;</p>');
    return sanitizeHtml(fixed, {
        allowedTags: ['blockquote', 'code', 'div', 'em', 'li', 'ol', 'p', 'strong', 'b', 's', 'i', 'u', 'ul', 'img', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        allowedSchemes: [ 'http', 'https'],
        allowedAttributes: {
            'a': [ 'href' ],
            'img': ['src']
        }
    });
};


export function stripAllHtml(html) {
    return sanitizeHtml(html, {
        allowedTags: [],
    });
}