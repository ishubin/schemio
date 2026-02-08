legendHeight = 0
legendTop = 0
legendWidth = width - padding * 2
legendLabels = List()
gridPaths = List()
plotOffset = padding
plotWidth = max(1, width - padding*2)
plotHeight = max(1, height - padding*2)
dx = plotWidth * xStep / max(0.000001, xMax - xMin)

xLabelsTotalWidth = 20

local labelsGap = 15
local labelIconWidth = 20
local minSpacing = 50



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
            idx, dataset.name, dataset.color,
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

    legendHeight = min(height/2, freeSlotY + maxTextHeight + 5)
}



func parseDatasetPoints(encodedPoints, yAxis, dx, plotWidth, plotHeight) {
    local dy = yAxis.max - yAxis.min
    if (abs(plotHeight / dy) > 100000 || abs(dx) > 10000) {
        return List()
    }

    local points = encodedPoints.split(',').map((p, idx) => {
        local value = parseFloat(p.trim())
        Point(dx * idx * 100 / plotWidth, (yAxis.max - value) * 100 / dy)
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


func onTextUpdate(itemId, item, text) {
    local prefix = 'legend-label-text-'
    if (!itemId.startsWith(prefix)) {
        return
    }
    text = stripHTML(text.replaceAll('</p>', '</p>\n')).trim().replaceAll('\n', '\\n')
    local dataIdx = parseInt(itemId.substring(prefix.length))
    if (dataIdx < 0 || dataIdx >= datasets.size) {
        return
    }

    datasets.get(dataIdx).name = text
}


func selectTheme(theme) {
    if (theme == 'light') {
        background = Fill.solid('#D4D7D9FF')
        strokeColor = '#C7C7C7FF'
        gridBackground = Fill.solid("#FAFAFAFF")
        gridColor = '#DCDBDBFF'
        fontColor = '#333333FF'

        datasets.forEach((dataset) => {
            local c = decodeColor(dataset.color).hsl()
            if (c.l > 0.4) {
                c.l = 0.4
            }
            if (c.s < 0.7) {
                c.s = 0.7
            }
            dataset.color = c.rgb().encode()
        })
    } else if (theme == 'dark') {
        background = Fill.solid('#202227FF')
        strokeColor = '#161717FF'
        gridBackground = Fill.solid("#252731FF")
        gridColor = '#474766FF'
        fontColor = '#C9C9CAFF'

        datasets.forEach((dataset) => {
            local c = decodeColor(dataset.color).hsl()
            if (c.l < 0.65) {
                c.l = 0.65
            }
            dataset.color = c.rgb().encode()
        })
    }
}


plotHeight = max(1, height - padding*2 - legendHeight)

// Calculate how many ticks can fit with the minimum spacing
local maxTicks = floor(plotHeight / minSpacing)
local yAxis = generateYAxis(yMin, yMax, max(2, maxTicks))
local xAxis = generateXAxis(xMin, xMax, xStep)

plotOffset = 0

yAxis.lines.forEach((line) => {
    gridPaths.add(Path(List(Point(0, line.position), Point(100, line.position))))

    local size = calculateTextSize(line.labelText, font, fontSize)
    size.w *= 1.1
    size.h *= 2.2

    plotOffset = max(plotOffset, size.w)
    yAxis.labels.add(AxisLabel(line.labelText, 0, line.position,  size.w, size.h))
})

plotOffset += padding

yAxis.labels.forEach((label) => { label.w = plotOffset })

plotWidth = max(1, width - plotOffset - padding)

xAxis.lines.forEach((line) => {
    gridPaths.add(Path(List(Point(line.position, 0), Point(line.position, 100))))
    local size = calculateTextSize(line.labelText, line.position * plotWidth / 100, plotHeight, font, fontSize)
    size.w *= 1.1
    size.h *= 2.2
    xLabelsTotalWidth = max(xLabelsTotalWidth, size.h)
    xAxis.labels.add(AxisLabel(line.labelText, plotOffset + line.position * plotWidth / 100, plotHeight, size.w, size.h))
})

plotHeight = max(1, height - xLabelsTotalWidth - legendHeight - padding)
yAxis.labels.forEach((label) => { label.y = label.y * plotHeight / 100 })
xAxis.labels.forEach((label) => { label.y = padding + plotHeight })


legendTop = xLabelsTotalWidth + plotHeight + padding


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
local yMax = ${yAxis.max}
local yMin = ${yAxis.min}
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