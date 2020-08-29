
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

export default [brightColors, lightColors, darkColors]