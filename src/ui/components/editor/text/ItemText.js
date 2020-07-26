import {getFontFamilyFor} from '../../../scheme/Fonts';

export function generateTextStyle(textSlot) {
    const style = {
        'color'           : textSlot.color,
        'font-size'       : textSlot.fontSize + 'px',
        'font-family'     : getFontFamilyFor(textSlot.font),
        'padding-left'    : textSlot.padding.left + 'px',
        'padding-right'   : textSlot.padding.right + 'px',
        'padding-top'     : textSlot.padding.top + 'px',
        'padding-bottom'  : textSlot.padding.bottom + 'px',
        'text-align'      : textSlot.halign,
        'vertical-align'  : textSlot.valign,
        'white-space'     : textSlot.whiteSpace,
        'display'         : 'table-cell',
    };

    return style;
}