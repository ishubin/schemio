const sanitizeHtml = require('sanitize-html');

module.exports = function (html) {
    return sanitizeHtml(html, {
        allowedTags: ['blockquote', 'code', 'div', 'em', 'li', 'ol', 'p', 'strong', 'b', 'i', 'u', 'ul', 'img', 'a'],
        allowedAttributes: {
            'a': [ 'href' ],
            'img': ['src']
        }
    });
};
