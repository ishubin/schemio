export default {
    shapeConfig: {
        shapeType: 'empty',
        computePath(item) {
            const w = item.area.w;
            const h = item.area.h;
            return `M 0 0  L ${w} 0  L ${w} ${h}  L 0 ${h} Z`;
        },
        args: {},
    }
}