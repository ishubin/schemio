
let scIiterator = 1;
function _sc(fillColor, strokeColor, textColor) {
    return {
        id         : `simple-color-style-${scIiterator++}`,
        fill       : {type: 'solid', color: fillColor},
        strokeColor: strokeColor,
        textColor  : textColor
    }
}
const brightColors = {
    name: 'Bright',
    styles: [
        _sc('rgba(240,240,240,1)', 'rgba(30,30,30,1.0)', 'rgba(0,0,0,1.0)'),
        _sc('rgba(38, 37, 37, 1)', 'rgba(30,30,30,1.0)', 'rgba(248, 248, 248, 1)'),
        _sc('rgba(251, 99, 99, 1)', 'rgba(30,30,30,1.0)', 'rgba(0,0,0,1.0)'),
        _sc('rgba(243, 180, 64, 1)', 'rgba(30,30,30,1.0)', 'rgba(0,0,0,1.0)'),
        _sc('rgba(244, 254, 0, 1)', 'rgba(30,30,30,1.0)', 'rgba(0,0,0,1.0)'),
        _sc('rgba(122, 255, 55, 1)', 'rgba(30,30,30,1.0)', 'rgba(0,0,0,1.0)'),
        _sc('rgba(57, 219, 136, 1)', 'rgba(30,30,30,1.0)', 'rgba(0,0,0,1.0)'),
        _sc('rgba(64, 236, 243, 1)', 'rgba(30,30,30,1.0)', 'rgba(0,0,0,1.0)'),
        _sc('rgba(128, 157, 243, 1)', 'rgba(30,30,30,1.0)', 'rgba(0,0,0,1.0)'),
        _sc('rgba(216, 128, 243, 1)', 'rgba(30,30,30,1.0)', 'rgba(0,0,0,1.0)'),
    ]
};


const lightColors = {
    name: 'Light',
    styles: [
        _sc('rgba(212, 210, 210, 1)', 'rgba(30,30,30,1.0)', 'rgba(0,0,0,1.0)'),
        _sc('rgba(114, 112, 112, 1)', 'rgba(30,30,30,1.0)', 'rgba(248, 248, 248, 1)'),
        _sc('rgba(237, 168, 168, 1)', 'rgba(30,30,30,1.0)', 'rgba(0,0,0,1.0)'),
        _sc('rgba(247, 208, 135, 1)', 'rgba(30,30,30,1.0)', 'rgba(0,0,0,1.0)'),
        _sc('rgba(245, 249, 142, 1)', 'rgba(30,30,30,1.0)', 'rgba(0,0,0,1.0)'),
        _sc('rgba(173, 245, 137, 1)', 'rgba(30,30,30,1.0)', 'rgba(0,0,0,1.0)'),
        _sc('rgba(143, 245, 193, 1)', 'rgba(30,30,30,1.0)', 'rgba(0,0,0,1.0)'),
        _sc('rgba(175, 247, 249, 1)', 'rgba(30,30,30,1.0)', 'rgba(0,0,0,1.0)'),
        _sc('rgba(206, 215, 245, 1)', 'rgba(30,30,30,1.0)', 'rgba(0,0,0,1.0)'),
        _sc('rgba(244, 208, 255, 1)', 'rgba(30,30,30,1.0)', 'rgba(0,0,0,1.0)'),
    ]
};


const darkColors = {
    name: 'Dark',
    styles: [
        _sc('rgba(120, 116, 116, 1)', 'rgba(30,30,30,1.0)', 'rgba(254, 254, 254, 1)'),
        _sc('rgba(77, 76, 76, 1)', 'rgba(30,30,30,1.0)', 'rgba(254, 254, 254, 1)'),
        _sc('rgba(124, 39, 16, 1)', 'rgba(30,30,30,1.0)', 'rgba(254, 254, 254, 1)'),
        _sc('rgba(130, 80, 14, 1)', 'rgba(30,30,30,1.0)', 'rgba(254, 254, 254, 1)'),
        _sc('rgba(129, 140, 0, 1)', 'rgba(30,30,30,1.0)', 'rgba(254, 254, 254, 1)'),
        _sc('rgba(58, 120, 27, 1)', 'rgba(30,30,30,1.0)', 'rgba(254, 254, 254, 1)'),
        _sc('rgba(21, 108, 94, 1)', 'rgba(30,30,30,1.0)', 'rgba(254, 254, 254, 1)'),
        _sc('rgba(17, 100, 126, 1)', 'rgba(30,30,30,1.0)', 'rgba(254, 254, 254, 1)'),
        _sc('rgba(71, 106, 223, 1)', 'rgba(30,30,30,1.0)', 'rgba(254, 254, 254, 1)'),
        _sc('rgba(106, 46, 124, 1)', 'rgba(30,30,30,1.0)', 'rgba(254, 254, 254, 1)'),
    ]
};

function _gc(color1, color2, strokeColor, textColor) {
    return {
        id: `gradient-color-style-${scIiterator++}`,
        fill: {
            type: 'gradient',
            gradient: {
                colors: [ { c: color1, p: 0 }, { c: color2, p: 100 } ],
                type: 'linear',
                direction: 0
            }
        },
        strokeColor: strokeColor,
        textColor  : textColor
    };
}
const gradientColors = {
    name: 'Gradient',
    styles: [
        _gc('rgba(151, 150, 150, 1)', 'rgba(247, 247, 247, 1)', 'rgba(94, 91, 91, 1)', 'rgba(0, 0, 0, 1)'),
        _gc('rgba(62, 62, 62, 1)', 'rgba(180, 180, 180, 1)', 'rgba(30,30,30,1.0)', 'rgba(254, 254, 254, 1)'),
        _gc('rgba(118, 38, 17, 1)', 'rgba(249, 143, 114, 1)', 'rgba(147, 22, 22, 1)', 'rgba(254, 254, 254, 1)'),
        _gc('rgba(130, 80, 14, 1)', 'rgba(237, 192, 132, 1)', 'rgba(100, 75, 33, 1)', 'rgba(254, 254, 254, 1)'),
        _gc('rgba(109, 118, 7, 1)', 'rgba(226, 235, 114, 1)', 'rgba(96, 93, 54, 1)', 'rgba(254, 254, 254, 1)'),
        _gc('rgba(58, 120, 27, 1)', 'rgba(169, 233, 138, 1)', 'rgba(33, 84, 20, 1)', 'rgba(254, 254, 254, 1)'),
        _gc('rgba(16, 85, 74, 1)', 'rgba(65, 214, 191, 1)', 'rgba(22, 90, 65, 1)', 'rgba(254, 254, 254, 1)'),
        _gc('rgba(17, 100, 126, 1)', 'rgba(165, 223, 241, 1)', 'rgba(38, 81, 106, 1)', 'rgba(254, 254, 254, 1)'),
        _gc('rgba(71, 106, 223, 1)', 'rgba(200, 211, 247, 1)', 'rgba(43, 65, 135, 1)', 'rgba(254, 254, 254, 1)'),
        _gc('rgba(106, 46, 124, 1)', 'rgba(239, 196, 251, 1)', 'rgba(122, 43, 135, 1)', 'rgba(254, 254, 254, 1)'),
    ]
}

export default [brightColors, lightColors, darkColors, gradientColors];