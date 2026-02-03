legendHeight = 0
legendWidth = width - padding * 2
legendLabels = List()
local labelsGap = 15
local labelIconWidth = 20
local legendTopMargin = 10

struct LegendLabel {
    name: ""
    color: "#ff00ffff"
    x: 0
    y: 0
    w: 1
    h: 1
}

if (hasLegend) {
    local maxTextHeight = -1

    local freeSlotWidth = legendWidth
    local freeSlotY = 0
    local freeSlotX = 0

    if (datasets.size == 0) {
        return
    }

    local allLabels = datasets.map((dataset, idx) => {
        local size = calculateTextSize(dataset.name, font, fontSize)
        size.h *= 2.2
        if (size.w > legendWidth) {
            size.w = legendWidth
        }
        LegendLabel(
            dataset.name, dataset.color,
            0, 0, size.w, size.h
        )
    })

    for( ; allLabels.size > 0 ; ) {
        local label = allLabels.get(0)
        if (labelIconWidth + label.w <= freeSlotWidth) {
            label.x = freeSlotX
            label.y = freeSlotY

            legendLabels.add(label)
            allLabels.shift()

            if (maxTextHeight < label.h) {
                maxTextHeight = label.h
            }

            freeSlotX += labelIconWidth + label.w + labelsGap
            freeSlotWidth = legendWidth - freeSlotX
        } else {
            local idx = allLabels.findIndex((label) => { label.w + labelIconWidth <= freeSlotWidth })
            if (idx >= 0) {
                local label = allLabels.get(idx)
                label.x = freeSlotX
                label.y = freeSlotY

                legendLabels.add(label)
                allLabels.remove(idx)

                if (maxTextHeight < label.h) {
                    maxTextHeight = label.h
                }

                freeSlotX += label.w + labelIconWidth + labelsGap
                freeSlotWidth = legendWidth - freeSlotX
            } else {
                freeSlotX = 0
                if (maxTextHeight > 0) {
                    freeSlotY += maxTextHeight + 5
                }
                freeSlotWidth = legendWidth

                label.x = freeSlotX
                label.y = freeSlotY

                legendLabels.add(label)
                allLabels.shift()

                freeSlotX += labelIconWidth + label.w + labelsGap
                freeSlotWidth = legendWidth - freeSlotX
            }
        }
    }

    legendHeight = min(height/2, legendTopMargin + freeSlotY + maxTextHeight + 5)
}

plotWidth = max(1, width - padding*2)
plotHeight = max(1, height - padding*2 - legendHeight)



dy = yMax - yMin
dx = plotWidth * xStep / max(0.000001, xMax - xMin)


struct Point {
    x: 0
    y: 0
    t: 'L'
}

struct SmoothPoint {
    x: 0
    y: 0
    x1: 0
    y1: 0
    x2: 0
    y2: 0
    t: 'B'
}

func parseDatasetPoints(encodedPoints) {
    if (abs(plotHeight / dy) > 100000 || abs(dx) > 10000) {
        return List()
    }

    local points = encodedPoints.split(',').map((p, idx) => {
        local value = parseFloat(p.trim())
        Point(dx * idx * 100 / plotWidth, (yMax - value) * 100 / dy)
    })

    if (lineType == 'smooth') {
        return points.map((p, idx) => {
            local vdx = dx * 100 / (plotWidth*2)
            SmoothPoint(p.x, p.y, -vdx, 0, vdx, 0)
        })
    } else {
        return points
    }
}



local baseScriptForFunctions = `
struct Point {
    x: 0
    y: 0
    x1: 0
    y1: 0
    x2: 0
    y2: 0
}

local xStep = ${xStep}
local xMax = ${xMax}
local xMin = ${xMin}
local yMax = ${yMax}
local yMin = ${yMin}
local lineType = "${lineType}"

local plot = findChildItemsByTag('chart-plot').find((x) => { x.getShape() == 'grid' })
local plotWidth = plot.getWidth()
local plotHeight = plot.getHeight()
local dy = yMax - yMin
local dx = plotWidth * xStep / max(0.000001, xMax - xMin)


func smoothenPoints(points) {
    points.forEach((p, idx) => {
        p.x1 = -dx/2
        p.y1 = 0
        p.x2 = dx/2
        p.y2 = 0
    })
}

func changePointsInAnimation(pathItem, srcPoints, dstPoints, t) {
    dstPoints.forEach((dstPoint, idx) => {
        local srcPoint = srcPoints.get(idx)
        local x = srcPoint.x * (1 - t) + dstPoint.x * t
        local y = srcPoint.y * (1 - t) + dstPoint.y * t
        if (lineType == 'smooth') {
            local x1 = srcPoint.x1 * (1 - t) + dstPoint.x1 * t
            local y1 = srcPoint.y1 * (1 - t) + dstPoint.y1 * t
            local x2 = srcPoint.x2 * (1 - t) + dstPoint.x2 * t
            local y2 = srcPoint.y2 * (1 - t) + dstPoint.y2 * t
            pathItem.setPathBezierPointPos(0, idx, x, y, x1, y1, x2, y2)
        } else {
            pathItem.setPathPointPos(0, idx, x, y)
        }
    })
}
`