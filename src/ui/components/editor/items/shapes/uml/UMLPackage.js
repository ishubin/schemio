
export default {
    shapeType: 'standard',

    computePath(item) {
        const W = item.area.w;
        const H = item.area.h;
        const BW = Math.min(Math.max(0, item.shapeProps.brickWidth), item.area.w);
        const BH = Math.min(Math.max(0, item.shapeProps.brickHeight), item.area.h);

        return `M 0 0  L ${BW} 0 L ${BW} ${BH} L 0 ${BH} Z`
                +`M ${0} ${BH} L ${W} ${BH} L ${W} ${H} L 0 ${H} Z`;
    },

    args: {
        brickWidth: {type: 'number', value: 60, name: 'Brick width', min: 0},
        brickHeight: {type: 'number', value: 20, name: 'Brick height', min: 0},
    },
}