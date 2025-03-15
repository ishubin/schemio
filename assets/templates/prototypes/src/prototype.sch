
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

func selectFrame(panelItem) {
    if (panelItem.id == 'simple') {
        frame = 'simple'
    } else if (panelItem.id == 'phone') {
        frame = 'phone'
        cornerRadius = 40
        width = 430
        height = 932
    } else if (panelItem.id == 'phone-landscape') {
        frame = 'phone-landscape'
        cornerRadius = 40
        width = 932
        height = 430
    } else if (panelItem.id == 'desktop') {
        cornerRadius = 10
        frame = 'desktop'
        width = 900
        height = 600
    }
}



frameCornerRadius = cornerRadius
frameFill = background
frameStrokeColor = strokeColor
frameStrokeSize = strokeSize
frameClip = true
phoneButtons = List()
isSimpleFrame = true

cameraOverlayWidth = min(width / 2, 80)
cameraOverlayHeight = 24
cameraLenseSize = cameraOverlayHeight * 0.4
cameraLensePadding = (cameraOverlayHeight - cameraLenseSize) / 2

if (frame == 'phone' || frame == 'phone-landscape') {
    frameFill = Fill.solid('rgba(95,95,95,1)')
    frameStrokeColor = 'rgba(95,95,95,1)'
    frameStrokeSize = 0
    frameClip = false
    isSimpleFrame = false
}

cameraOverlayX = 0
cameraOverlayY = 0
cameraOverlayR = 0
if (frame == 'phone') {
    btnWidth = width*0.022
    phoneButtons = List(
        Item('btn-r', 'Button', 'rect', width - btnWidth/2, height*0.32, btnWidth, height*0.125),
        Item('btn-l1', 'Button', 'rect', -btnWidth/2, height*0.194, btnWidth, height*0.045),
        Item('btn-l2', 'Button', 'rect', -btnWidth/2, height*0.27, btnWidth, height*0.08),
        Item('btn-l3', 'Button', 'rect', -btnWidth/2, height*0.381, btnWidth, height*0.08),
    )
    cameraOverlayX = (width - 8)/2 - cameraOverlayWidth/2
    cameraOverlayY = 12
}
if (frame == 'phone-landscape') {
    btnHeight = height*0.022
    cameraOverlayWidth = min(height / 2, 80)
    phoneButtons = List(
        Item('btn-r', 'Button', 'rect', width*0.32, -btnHeight/2, width*0.125, btnHeight),
        Item('btn-l1', 'Button', 'rect', width*0.194, height - btnHeight/2, width*0.045, btnHeight),
        Item('btn-l2', 'Button', 'rect', width*0.27, height - btnHeight/2, width*0.08, btnHeight),
        Item('btn-l3', 'Button', 'rect', width*0.381, height - btnHeight/2, width*0.08, btnHeight),
    )
    cameraOverlayX = 12 
    cameraOverlayY = (height - 8)/2 - cameraOverlayWidth/2
    cameraOverlayR = -90
}

desktopButtons = List()

if (frame == 'desktop') {
    frameCornerRadius = max(0, min(cornerRadius, 15))
    isSimpleFrame = false
    frameFill = Fill.solid('rgba(95,95,95,1)')
    frameStrokeColor = 'rgba(95,95,95,1)'
    frameStrokeSize = 0
    desktopButtons = List(
        Item('d-btn-1', 'Button', 'rect', 14, 8, 12, 12),
        Item('d-btn-2', 'Button', 'rect', 34, 8, 12, 12),
        Item('d-btn-3', 'Button', 'rect', 54, 8, 12, 12),
    )
}