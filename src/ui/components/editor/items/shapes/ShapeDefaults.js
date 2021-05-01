export function getStandardRectPins(item) {
    const w = item.area.w;
    const h = item.area.h;
    return [{
        x: w/2, y: h/2,
    }, {
        x: w / 2, y: 0,
        nx: 0, ny: -1
    }, {
        x: w / 2, y: h,
        nx: 0, ny: 1
    }, {
        x: 0, y: h/2,
        nx: -1, ny: 0
    }, {
        x: w, y: h/2,
        nx: 1, ny: 0
    }];
}