
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
