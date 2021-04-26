function computePath(item) {
    const w = item.area.w;
    const h = item.area.h;
    return `M ${w/2} 0  L ${w} ${h/2}  L ${w/2} ${h}  L 0 ${h/2} Z`;
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
