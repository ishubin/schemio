import {getFontFamilyFor} from '../../../scheme/Fonts';

export function generateTextStyle(textSlot) {
    const style = {
        'color'           : textSlot.color,
        'font-size'       : textSlot.fontSize + 'px',
        'font-family'     : getFontFamilyFor(textSlot.font),
        'padding-left'    : textSlot.paddingLeft + 'px',
        'padding-right'   : textSlot.paddingRight + 'px',
        'padding-top'     : textSlot.paddingTop + 'px',
        'padding-bottom'  : textSlot.paddingBottom + 'px',
        'text-align'      : textSlot.halign,
        'vertical-align'  : textSlot.valign,
        'white-space'     : textSlot.whiteSpace,
        'display'         : 'table-cell',
    };

    return style;
}