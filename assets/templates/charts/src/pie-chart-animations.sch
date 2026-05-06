
struct PieAnimation {
    sliceItems: List()
    labelItems: List()
    srcSlices: Map()
    dstSlices: Map()
    srcLabels: Map()
    dstLabels: Map()
}

func animationUpdatePie(pieAnimation, t) {
    pieAnimation.sliceItems.forEach((item) => {
        local idx = item.getVar('idx')

        local srcSlice = pieAnimation.srcSlices.get(idx)
        local dstSlice = pieAnimation.dstSlices.get(idx)
        if (srcSlice && dstSlice) {
            local angle = srcSlice.angle * (1 - t) + dstSlice.angle * t
            local percent = srcSlice.percent * (1 - t) + dstSlice.percent * t
            item.setAngle(angle)
            item.setPercent(percent)
        }
    })

    pieAnimation.labelItems.forEach((item) => {
        local idx = item.getVar('sliceIdx')
        local srcLabel = pieAnimation.srcLabels.get(idx)
        local dstLabel = pieAnimation.dstLabels.get(idx)
        if (srcLabel && dstLabel) {
            item.setPos(
                srcLabel.x * (1 - t) + dstLabel.x * t,
                srcLabel.y * (1 - t) + dstLabel.y * t,
            )
            item.setWidth(srcLabel.w * (1 - t) + dstLabel.w * t)
            item.setHeight(srcLabel.h * (1 - t) + dstLabel.h * t)
            item.setOpacity(srcLabel.opacity * (1 - t) + dstLabel.opacity * t)
            item.setText('body', dstLabel.text)
        }
    })
}

func animationUpdatePieInit(sliceItemMap, sliceValues, initialAngle) {
    local sliceItems = findChildItemsByTag('pie-chart-slice')

    local dstTotal = 0
    sliceValues.forEach((value) => {
        dstTotal += value
    })
    if (dstTotal < 0.0000001) {
        dstTotal = 0.0000001
    }

    local slices = sliceItems.map((item) => {
        local sliceIdx = item.getVar('idx')
        local srcValue = item.getVar('value')
        local srcPercent = item.getVar('percent')
        sliceItemMap.set(sliceIdx, item)

        PieSlice(
            "",
            sliceIdx,
            item.getVar("name"),
            srcValue,
            srcPercent,
            '#FF00FFFF',
            item.getAngle(),
            List()
        )
    })
    alignSlices(slices, initialAngle, false)

    local dstSlices = slices.map((slice) => {
        local dstValue = if (slice.idx < sliceValues.size) { sliceValues.get(slice.idx) } else { 0 }
        local dstPercent = dstValue * 100 / dstTotal

        PieSlice(
            "",
            slice.idx,
            slice.name,
            dstValue,
            dstPercent,
            slice.color,
            slice.angle,
            List()
        )
    })
    alignSlices(dstSlices, initialAngle, false)

    local srcSliceMap = Map()
    slices.forEach((slice) => { srcSliceMap.set(slice.idx, slice) })
    local dstSliceMap = Map()
    dstSlices.forEach((slice) => { dstSliceMap.set(slice.idx, slice) })


    local labelItems = findChildItemsByTag('pie-chart-slice-label')

    local srcLabels = Map()
    local dstLabels = Map()

    buildSliceLabels(slices, padding, padding, chartWidth, chartHeight).forEach((label) => {
        srcLabels.set(label.sliceIdx, label)
    })
    buildSliceLabels(dstSlices, padding, padding, chartWidth, chartHeight).forEach((label) => {
        dstLabels.set(label.sliceIdx, label)
    })

    PieAnimation(sliceItems, labelItems, srcSliceMap, dstSliceMap, srcLabels, dstLabels)
}

func animationUpdatePieEnd() {
    pieAnimation.sliceItems.forEach((item) => {
        local idx = item.getVar('idx')

        local dstSlice = pieAnimation.dstSlices.get(idx)
        if (dstSlice) {
            item.setVar('value', dstSlice.value)
            item.setVar('percent', dstSlice.percent)
        }
    })
}

local changeAnimationInitScript = `
${BASE_SCRIPT}
${enc animationUpdatePieInit}
${enc animationUpdatePie}
${enc animationUpdatePieEnd}
${enc PieAnimation}
local initialAngle = ${initialAngle}
local hasLabels = ${hasLabels}
local padding = ${padding}
local chartWidth = ${chartWidth}
local chartHeight = ${chartHeight}
local labelFont = "${labelFont}"
local legendFont = "${legendFont}"
local labelFontSize = ${labelFontSize}
local labelDisplay = '${labelDisplay}'
local labelDistance = ${labelDistance}

local sliceValues = values.split(',').map(parseFloat)

local sliceItemMap = Map()
local pieAnimation = animationUpdatePieInit(sliceItemMap, sliceValues, initialAngle)
`

local changeAnimationLoopScript = `
animationUpdatePie(pieAnimation, t)
`

local changeAnimationEndScript = `
animationUpdatePieEnd(pieAnimation)
`