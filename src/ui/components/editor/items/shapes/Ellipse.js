export default {
    shapeType: 'standard',

    computePath(item) {
        const rx = item.area.w / 2;
        const ry = item.area.h / 2;
        return `M ${rx}, 0 a ${rx}, ${ry} 0 1,0 1,0 Z`;
    }

}