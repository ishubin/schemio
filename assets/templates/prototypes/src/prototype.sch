
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


cameraOverlayWidth = min(width / 2, 70)
cameraOverlayHeight = 20
cameraLenseSize = cameraOverlayHeight / 2
cameraLensePadding = (cameraOverlayHeight - cameraLenseSize) / 2


frameFill = background
frameStrokeColor = strokeColor
frameStrokeSize = strokeSize
if (frame == 'phone') {
    frameFill = Fill.solid('rgba(95,95,95,1)')
    frameStrokeColor = 'rgba(95,95,95,1)'
    frameStrokeSize = 0
}
