function createPointsForCurlyBracket(p, d, r, D, R) {
    const A = Math.min(40, R * 0.2);
    const B = Math.min(20, R * 0.2);

    return [
        p,
        {type: 'Q', x1: p.x + d.x * D/2, y1: p.y + d.y * D/2,           x2: p.x + d.x * D / 2 + r.x * A,            y2: p.y + d.y * D / 2 + r.y * A},
        {x: p.x + d.x * D / 2 + r.x * (R/2 - B),    y: p.y + d.y * D / 2 + r.y * (R/2 - B)},
        {type: 'Q', x1: p.x + d.x * D/2  + r.x * (R/2),  y1: p.y + d.y*D/2 + r.y*R/2,        x2: p.x + d.x * D + r.x * (R/2),            y2: p.y + d.y * D  + r.y * (R/2)},
        {type: 'Q', x1: p.x + d.x * D/2  + r.x * (R/2),  y1: p.y + d.y*D/2 + r.y*R/2,        x2: p.x + d.x * D / 2 + r.x * (R/2 + B),    y2: p.y + d.y * D / 2 + r.y * (R/2 + B)},
        {x: p.x + d.x * D / 2 + r.x * (R - A),      y: p.y + d.y * D / 2 + r.y * (R - A)},
        {type: 'Q', x1: p.x + r.x * R + d.x*D/2,    y1: p.y + r.y*R + d.y*D/2,      x2: p.x + r.x * R,                          y2: p.y + r.y * R},
    ];
}

function createPointsForCurlySharp(p, d, r, D, R) {
    const A = Math.min(40, R * 0.2);
    const B = Math.min(20, R * 0.2);

    return [
        p,
        {x: p.x + d.x * D / 2 + r.x * A,            y: p.y + d.y * D / 2 + r.y * A},
        {x: p.x + d.x * D / 2 + r.x * (R/2 - B),    y: p.y + d.y * D / 2 + r.y * (R/2 - B)},
        {x: p.x + d.x * D + r.x * (R/2),            y: p.y + d.y * D  + r.y * (R/2)},
        {x: p.x + d.x * D / 2 + r.x * (R/2 + B),    y: p.y + d.y * D / 2 + r.y * (R/2 + B)},
        {x: p.x + d.x * D / 2 + r.x * (R - A),      y: p.y + d.y * D / 2 + r.y * (R - A)},
        {x: p.x + r.x * R,                          y: p.y + r.y * R},
    ];
}

function createPointsForSquareBracket(p, d, r, D, R) {
    return [
        p,
        {x: p.x + d.x * D,              y: p.y + d.y * D},
        {x: p.x + d.x * D + r.x * R,    y: p.y + d.y * D + r.y * R},
        {x: p.x + r.x * R,              y: p.y + r.y * R},
    ];
}

function createPointsForRoundBracket(p, d, r, D, R) {
    const A = 0.3;
    return [
        p,
        {
            type: 'C', 
            x1: p.x + d.x * D + r.x * A,        y1: p.y + d.y * D + r.y * A,
            x2: p.x + d.x * D + r.x * (R-A),    y2: p.y + d.y * D + r.y * (R-A),
            x3: p.x + r.x * R,                  y3: p.y + r.y * R,
        },
    ];
}

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'bracket',

        menuItems: [{
            name: 'Curly Bracket',
            group: 'General',
            iconUrl: '/assets/images/items/curly-bracket.svg',
            item: {
                shapeProps: {
                    fill: {type: 'none'},
                    style: 'curly',
                }
            },
            previewArea: {x: 5, y: 30, w: 130, h: 15, r: 0},
        }, {
            name: 'Square Bracket',
            group: 'General',
            iconUrl: '/assets/images/items/square-bracket.svg',
            item: {
                shapeProps: {
                    fill: {type: 'none'},
                    style: 'square'
                }
            },
            previewArea: {x: 5, y: 30, w: 130, h: 15, r: 0},
        }, {
            name: 'Round Bracket',
            group: 'General',
            iconUrl: '/assets/images/items/round-bracket.svg',
            item: {
                shapeProps: {
                    fill: {type: 'none'},
                    style: 'round'
                }
            },
            previewArea: {x: 5, y: 30, w: 130, h: 15, r: 0},
        }],

        getPins(item) {
            return [];
        },

        getTextSlots(item) {
            return [];
        },

        computePath(item) {
            // starting point
            const p = {x: 0, y: 0};

            // direction vector (down)
            const d = {x: 0, y: 1};
            let D = item.area.h;

            // direction vector (right)
            const r = {x: 1, y: 0};
            let R = item.area.w;

            if (item.area.w < item.area.h) {
                d.x = 1;
                d.y = 0;
                D = item.area.w;

                r.x = 0;
                r.y = -1;
                R = item.area.h;
                p.x = 0;
                p.y = item.area.h;
            }

            let points = [];
            if (item.shapeProps.style === 'curly') {
                points = createPointsForCurlyBracket(p, d, r, D, R);
            } else if (item.shapeProps.style === 'curly-sharp') {
                points = createPointsForCurlySharp(p, d, r, D, R);
            } else if (item.shapeProps.style === 'round') {
                points = createPointsForRoundBracket(p, d, r, D, R);
            } else {
                points = createPointsForSquareBracket(p, d, r, D, R);
            }
            let path = `M ${points[0].x} ${points[0].y}`;

            for (let i = 1; i < points.length; i++) {
                if (points[i].type === 'C') {
                    path += ` C ${points[i].x1} ${points[i].y1} ${points[i].x2} ${points[i].y2} ${points[i].x3} ${points[i].y3}`;
                } else if (points[i].type === 'Q') {
                    path += ` Q ${points[i].x1} ${points[i].y1} ${points[i].x2} ${points[i].y2}`;
                } else {
                    path += ` L ${points[i].x} ${points[i].y}`;
                }
            }

            return path;
        },

        args: {
            style: {type: 'choice', value: 'curly', name: 'Style', options: ['curly', 'curly-sharp', 'square', 'round']},
        },
    }
}