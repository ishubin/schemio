const conversions = {
    // Year
    YYYY: (date) => date.getFullYear(),
    YY:   (date) => String(date.getFullYear()).slice(-2),

    // Month
    MMMM: (date) => date.toLocaleString('default', { month: 'long' }),
    MMM:  (date) => date.toLocaleString('default', { month: 'short' }),
    MM:   (date) => String(date.getMonth() + 1).padStart(2, '0'),
    M:    (date) => date.getMonth() + 1,

    // Day
    DD:   (date) => String(date.getDate()).padStart(2, '0'),
    D:    (date) => date.getDate(),
    dddd: (date) => date.toLocaleString('default', { weekday: 'long' }),
    ddd:  (date) => date.toLocaleString('default', { weekday: 'short' }),

    // Time
    HH:   (date) => String(date.getHours()).padStart(2, '0'),
    H:    (date) => date.getHours(),
    hh:   (date) => String(date.getHours() % 12 || 12).padStart(2, '0'),
    h:    (date) => date.getHours() % 12 || 12,
    mm:   (date) => String(date.getMinutes()).padStart(2, '0'),
    m:    (date) => date.getMinutes(),
    ss:   (date) => String(date.getSeconds()).padStart(2, '0'),
    s:    (date) => date.getSeconds(),
    A:    (date) => (date.getHours() >= 12 ? 'PM' : 'AM'),
    a:    (date) => (date.getHours() >= 12 ? 'pm' : 'am')
};

const sortedTokens = Object.keys(conversions).sort((a, b) => b.length - a.length);
const pattern = new RegExp(sortedTokens.join('|'), 'g');

export function formatDate(date, format) {
    if (!(date instanceof Date) || isNaN(date)) return "";

    return format.replace(pattern, (matched) => {
        if (conversions.hasOwnProperty(matched)) {
            return conversions[matched](date);
        }
        return '';
    });
}