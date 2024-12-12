func onAreaUpdate(itemId, item, area) {
    popupX = area.x - width
    popupY = area.y
    popupWidth = area.w
    popupHeight = area.h
}

shapeProps = Map()
if (shape == 'rect') {
    shapeProps.set('cornerRadius', cornerRadius)
} else if (shape == 'npoly') {
    shapeProps.set('corners', corners)
    shapeProps.set('angle', angle)
    shapeProps.set('rounding', rounding)
}