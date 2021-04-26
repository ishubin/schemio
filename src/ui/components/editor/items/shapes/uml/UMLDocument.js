function computePath(item) {
    const d = item.area.h / 8;
    const w = item.area.w;
    const h = item.area.h - d;
    const k = h / 2;
    return `M 0 0 L ${w} 0 L ${w} ${h} C ${w/2} ${h-k} ${w/2} ${h+k} 0 ${h} Z`;
}

export default {
    shapeConfig: {
        shapeType: 'standard',

        computePath(item) {
            return computePath(item);
        },

        args: { },
    }
}

