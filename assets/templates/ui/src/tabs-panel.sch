numTabs         = max(1, numTabs)
topMargin       = padding
tabMargin       = max(10, cornerRadius) + padding
tw              = max(10, min((width - 2 * tabMargin) / numTabs - tabGap, tabWidth))
tabTag          = 'tab-' + uid()
containerTag    = 'tab-container-' + uid()
containerWidth  = max(1, width - padding * 2)
containerHeight = max(1, height - padding - (topMargin + tabHeight - tabCornerRadius - 1))

func swapTabs(tabIdx1, tabIdx2) {
    swapNativeChildren(`tab-container-${tabIdx1}`, `tab-container-${tabIdx2}`)
}

func deleteTab(tabIndex) {
    for (i = tabIndex + 1; i < numTabs; i++) {
         moveNativeChildren(`tab-container-${i+1}`, `tab-container-${i}`)
         tabNext = findItemByTemplatedId(`tab-${i+1}`)
         tab = findItemByTemplatedId(`tab-${i}`)
         if (tabNext && tab) {
               tab.textSlots = clone(tabNext.textSlots)
         }
    }
    numTabs = max(1, numTabs - 1)
}

func insertTabAt(tabIndex) {
    duplicateItem(`tab-container-${numTabs}`, `tab-container-${numTabs+1}`, `Tab container ${numTabs+1}`)
    duplicateItem(`tab-${numTabs}`, `tab-${numTabs+1}`, `Tab ${numTabs+1}`)
    for (i = numTabs; i > tabIndex; i--) {
         moveNativeChildren(`tab-container-${i}`, `tab-container-${i+1}`)
         tabNext = findItemByTemplatedId(`tab-${i+1}`)
         tab = findItemByTemplatedId(`tab-${i}`)
         if (tabNext && tab) {
               tabNext.textSlots = clone(tab.textSlots)
         }
    }
    numTabs = numTabs + 1
}

func onDeleteItem(itemId, item) {
    if (itemId.startsWith('tab-container-')) {
        tabIdx = parseInt(itemId.substring('tab-container-'.length)) - 1
        deleteTab(tabIdx)
    } else if (itemId.startsWith('tab-')) {
        tabIdx = parseInt(itemId.substring('tab-'.length)) - 1
        deleteTab(tabIdx)
    }
}
