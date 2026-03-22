
struct PieAnimation {
    srcSlices: Map()
    dstSlices: Map()
    sliceItems: List()
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
            slice.name
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
    PieAnimation(srcSliceMap, dstSliceMap, sliceItems)
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
${enc animationUpdatePie}
${enc animationUpdatePieInit}
${enc animationUpdatePieEnd}
${enc PieAnimation}
local initialAngle = ${initialAngle}

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