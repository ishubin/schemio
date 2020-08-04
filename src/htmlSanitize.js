const sanitizeHtml = require('sanitize-html');

module.exports = function (html) {
    return sanitizeHtml(html, {
        allowedTags: ['blockquote', 'code', 'div', 'em', 'li', 'ol', 'p', 'strong', 'b', 's', 'i', 'u', 'ul', 'img', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        allowedAttributes: {
            'a': [ 'href' ],
            'img': ['src']
        }
    });
};
