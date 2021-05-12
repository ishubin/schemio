export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'npoly',

        menuItems: [{
            group: 'Basic Shapes',
            name: 'N-Polygon',
            iconUrl: '/assets/images/items/npolygon.svg',
        }],

        computePath(item) {
            const cx = item.area.w/2;
            const cy = item.area.h/2;

            const corners = Math.max(3, item.shapeProps.corners);
            let path = '';

            for(let i = 0; i < corners; i++) {
                const x = item.area.w / 2 * Math.cos(i * 2* Math.PI / corners - Math.PI / 2 + item.shapeProps.angle * Math.PI / 180) + cx;
                const y = item.area.h / 2 * Math.sin(i * 2* Math.PI / corners - Math.PI / 2 + item.shapeProps.angle * Math.PI / 180) + cy;

                if (i === 0) {
                    path = `M ${x} ${y} `;
                }

                path += ` L ${x} ${y}`;
            }

            return path + ' Z';
        },

        args: {
            corners: {type: 'number', value: 6, name: 'Corners'},
            angle  : {type: 'number', value: 0, name: 'Angle'},
        },

    }
}