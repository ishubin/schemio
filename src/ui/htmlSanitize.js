import sanitizeHtml from 'sanitize-html';

export default function htmlSanitize(html) {
    return sanitizeHtml(html, {
        allowedTags: ['blockquote', 'code', 'div', 'em', 'li', 'ol', 'p', 'strong', 'b', 'i', 'u', 'ul', 'img'],
        allowedAttributes: {
            'a': [ 'href' ],
            'img': ['src']
        }
    });
};
