function zeroPad(n) {
    if (n >=0 && n < 10) {
        return '0' + n;
    } else {
        return '' + n;
    }
}

export function formatDateTime(encodedDate ) {
    const d = new Date(encodedDate);
    const z = zeroPad;
    return `${d.getFullYear()}.${z(d.getMonth()+1)}.${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
}