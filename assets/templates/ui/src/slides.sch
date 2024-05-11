buttonMargin          = round(padding / 2)
containerMarginX      = buttonMargin*2 + buttonSize
containerMarginTop    = 60
btnIconK              = buttonSize / 60
btnIconWidth          = 20 * btnIconK
btnIconHeight         = 25 * btnIconK
containerMarginBottom = padding
slideWidth            = round(max(1, width - containerMarginX * 2))
slideHeight           = round(max(1, height - containerMarginTop - containerMarginBottom))
slideMargin           = 10
currentSlideVarName   = 'current-slide-' + uid()
headerWidth           = min(max(200, round(width / 2)), width)

func swapSlides(idx1, idx2) {
    swapNativeChildren(`slide-${idx1}`, `slide-${idx2}`)
}

func deleteSlide(slideIndex) {
    for (i = slideIndex + 1; i < numSlides; i++) {
        moveNativeChildren(`slide-${i+1}`, `slide-${i}`)
    }
    numSlides = max(1, numSlides - 1)
}

func insertSlideAt(slideIndex) {
    duplicateItem(`slide-${numSlides}`, `slide-${numSlides+1}`, `Slide #${numSlides+1}`)
    for (i = numSlides; i > slideIndex; i--) {
        moveNativeChildren(`slide-${i}`, `slide-${i+1}`)
    }
    numSlides = numSlides + 1
}

func onDeleteItem(itemId, item) {
    if (itemId.startsWith('slide-')) {
        slideIdx = parseInt(itemId.substring('slide-'.length)) - 1
        deleteSlide(slideIdx)
    }
}
