const fontCorrections = {
    'Lucida Sans Unicode': 1.4,
    'Lucida Console': 1.47,
};

export function calculateTextSize(text, font, fontSize) {
    const canvas = calculateTextSize.canvas || (calculateTextSize.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d");
    context.font = `${fontSize}px ${font}`;
    const metrics = context.measureText(text);
    let wk = 1;
    if (fontCorrections.hasOwnProperty(font)) {
        wk = fontCorrections[font];
    }
    return {
        w: metrics.width * wk,
        h: Math.abs(metrics.actualBoundingBoxAscent) + Math.abs(metrics.actualBoundingBoxDescent)
    };
}