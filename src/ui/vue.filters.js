
function zeroPad(n) {
    if (n >=0 && n < 10) {
        return '0' + n;
    } else {
        return '' + n;
    }
}

export function applyVueFilters(vue) {
    vue.filter('formatDateTime', encodedDate => {
        const d = new Date(encodedDate);
        const z = zeroPad;
        return `${d.getFullYear()}.${z(d.getMonth())}.${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
    });
}