
function computePath(item) {
    const w = item.area.w;
    const h = item.area.h;
    const r = Math.min(w, h) / 2;
    return `M ${r} 0 L ${w-r} 0 A ${r} ${r} 0 0 1 ${w-r} ${h} L ${r} ${h} A ${r} ${r} 0 0 1 ${r} 0 Z`;
}

export default {
    shapeConfig: {
        shapeType: 'standard',

        computePath(item) {
            return computePath(item);
        },

        computeOutline(item) {
            return computePath(item);
        },

        args: {
            depth: {type: 'number', value: 20, name: 'Depth'},
        },
    }
}
