
func duplicatePage(pageIdx) {
    duplicateItem(`page-${numPages}`, `page-${numPages+1}`, `Page ${numPages+1}`)
    copyNativeChildren(`page-${pageIdx}`, `page-${numPages+1}`)
    numPages += 1
}

func deletePage(pageIndex) {
    for (i = pageIndex + 1; i < numPages; i++) {
        moveNativeChildren(`page-${i+1}`, `page-${i}`)
    }
    numPages = max(1, numPages - 1)
}

func onDeleteItem(itemId, item) {
    if (itemId.startsWith('page-')) {
        pageIdx = parseInt(itemId.substring('page-'.length)) - 1
        deletePage(pageIdx)
    }
}


cameraOverlayWidth = min(width / 2, 80)
cameraOverlayHeight = 24
cameraLenseSize = cameraOverlayHeight * 0.4
cameraLensePadding = (cameraOverlayHeight - cameraLenseSize) / 2


frameCornerRadius = cornerRadius
frameFill = background
frameStrokeColor = strokeColor
frameStrokeSize = strokeSize
frameClip = true
btnWidth = width*0.022
phoneButtons = List()
isSimpleFrame = true

if (frame == 'phone') {
    frameFill = Fill.solid('rgba(95,95,95,1)')
    frameStrokeColor = 'rgba(95,95,95,1)'
    frameStrokeSize = 0
    frameClip = false
    phoneButtons = List(
        Item('btn-r', 'Button', 'rect', width - btnWidth/2, height*0.32, btnWidth, height*0.125),
        Item('btn-l1', 'Button', 'rect', -btnWidth/2, height*0.194, btnWidth, height*0.045),
        Item('btn-l2', 'Button', 'rect', -btnWidth/2, height*0.27, btnWidth, height*0.08),
        Item('btn-l3', 'Button', 'rect', -btnWidth/2, height*0.381, btnWidth, height*0.08),
    )
    isSimpleFrame = false
}

if (frame == 'desktop') {
    frameCornerRadius = 10
    isSimpleFrame = false
    frameFill = Fill.solid('rgba(95,95,95,1)')
    frameStrokeColor = 'rgba(95,95,95,1)'
    frameStrokeSize = 0
}