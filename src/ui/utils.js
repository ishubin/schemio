function leadingZero(number) {
    if (number < 10) {
        return '0' + number;
    } else {
        return '' + number;
    }
}

module.exports = {
    formatDateAndTime(dateInMillis) {
        var d = new Date(dateInMillis);
        return `${leadingZero(d.getFullYear())}.${leadingZero(d.getMonth())}.${leadingZero(d.getDate())} ${leadingZero(d.getHours())}:${leadingZero(d.getMinutes())}`;
    },

    clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
}
