legendTop = 0
legendWidth = width - padding * 2
legendTopMargin = 25
legend = Legend()
gridPaths = List()
plotOffset = padding
plotWidth = max(1, width - padding*2)
plotHeight = max(1, height - padding*2)
maxPoints = ceil(abs(xMax - xMin) / max(0.0000001, xStep)) + 1

xLabelsFullHeight = 20

local labelsOverride = xAxisLabels.trim().split(",").map((x) => { x.trim() }).filter((x) => { x.length > 0 })

local size = calculateTextSize("TgjW", font, titleFontSize)
axisNameFontMaxHeight = size.h * 2


local labelsGap = 15
local labelIconWidth = 20
local minSpacing = 50


pointStrokeSize = if (pointType == "hollow" || pointType == "cut") {
    2
} else {
    0
}

struct Dataset {
    args: 0
    points: List()
}

struct Area {
    x: 0
    y: 0
    w: 0
    h: 0
}

struct BarDataset {
    args: 0
    bars: List()
}


if (hasLegend) {
    legend = buildLegend(datasets, legendWidth, legendTopMargin)
}



func parseDatasetPoints(encodedPoints, dx, yAxis, plotWidth, plotHeight) {
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
    local legendLabelPrefix = 'legend-label-text-'
    local xAxisLabelPrefix = 'x-axis-label-'

    if (itemId == 'axis-title-y') {
        yTitle = text
    } else if (itemId == 'axis-title-x') {
        xTitle = text
    } else if (itemId.startsWith(xAxisLabelPrefix)) {
        onXAxisLabelUpdate(parseInt(itemId.substring(xAxisLabelPrefix.length)), text)
    } else if (itemId.startsWith(legendLabelPrefix)) {
        text = stripHTML(text.replaceAll('</p>', '</p>\n')).trim().replaceAll('\n', '\\n')
        local dataIdx = parseInt(itemId.substring(legendLabelPrefix.length))
        if (dataIdx < 0 || dataIdx >= datasets.size) {
            return
        }
        datasets.get(dataIdx).name = text
    }
}

func onDeleteItem(itemId, item) {
    if (itemId == 'axis-title-y') {
        yTitleShow = false
    } else if (itemId == 'axis-title-x') {
        xTitleShow = false
    } else if (itemId == 'legend') {
        hasLegend = false
    }
}

func onXAxisLabelUpdate(labelIdx, text) {
    if (labelsOverride.size > 0) {
        if (labelIdx >= 0 && labelIdx < labelsOverride.size) {
            labelsOverride.set(labelIdx, stripHTML(text))

            local str = ""
            labelsOverride.forEach((value, idx) => {
                if (idx > 0) {
                    str += ", "
                }
                str += value
            })
            xAxisLabels = str
        }
    }
}


func selectTheme(theme) {
    if (theme == 'light') {
        background = '#E8E8E9FF'
        strokeColor = '#C7C7C7FF'
        gridColor = '#BDBDBDFF'
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
        background = '#202227FF'
        strokeColor = '#161717FF'
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


plotHeight = max(1, height - padding*2 - legend.h)

// Calculate how many ticks can fit with the minimum spacing
local maxTicks = floor(plotHeight / minSpacing)
local yAxis = generateYAxis(yMin, yMax, max(2, maxTicks), font, axisFontSize)


plotOffset = 0
yAxis.labels.forEach((label) => {
    plotOffset = max(plotOffset, label.w)
})

plotOffset += padding

if (yTitleShow) {
    plotOffset += axisNameFontMaxHeight
}

yAxis.labels.forEach((label) => { label.w = plotOffset })

plotWidth = max(1, width - plotOffset - padding)

local xAxis = generateXAxis(xMin, xMax, xStep, plotOffset, plotWidth, plotHeight, font, axisFontSize, labelsOverride)

xAxis.labels.forEach((label) => {
    xLabelsFullHeight = max(xLabelsFullHeight, label.h)
})

xTitleK = if (xTitleShow) { 1 } else { 0 }

plotHeight = max(1, height - xLabelsFullHeight - axisNameFontMaxHeight * xTitleK - legend.h - padding * 2)
yAxis.labels.forEach((label) => { label.y = padding + label.y * plotHeight / 100 - label.h / 2 })
xAxis.labels.forEach((label) => { label.y = padding + plotHeight })

legendTop = xLabelsFullHeight + axisNameFontMaxHeight * xTitleK + plotHeight + padding

// generating plot grid paths
yAxis.lines.forEach((line) => {
    gridPaths.add(Path(List(Point(0, line.position), Point(100, line.position))))
})
xAxis.lines.forEach((line) => {
    gridPaths.add(Path(List(Point(line.position, 0), Point(line.position, 100))))
})


local dx = plotWidth * xStep / max(0.000001, xMax - xMin)


centerValue = if (yAxis.min <= 0 && 0 < yAxis.max) {
    0
} else if (yAxis.max < 0) {
    yAxis.max
} else {
    yAxis.min
}

yCenter = (yAxis.max - centerValue) * plotHeight / (yAxis.max - yAxis.min)

parsedDatasets = datasets.map((dataset) => {
    Dataset(dataset, parseDatasetPoints(dataset.values, dx, yAxis, plotWidth, plotHeight))
})

parsedLineDatasets = parsedDatasets.filter((dataset) => { dataset.args.type == 'line' }).map((dataset) => {
    local threshold = max(1, maxPoints)
    for ( ; dataset.points.size > threshold ; ) {
        dataset.points.pop()
    }
    dataset
})

local filteredBarDatasets = parsedDatasets.filter((dataset) => { dataset.args.type == 'bar' })
local totalBarDatasets = filteredBarDatasets.size
barWidth = dx / (totalBarDatasets + 1)

parsedBarDatasets = filteredBarDatasets.map((dataset, datasetIdx) => {
    local threshold = max(1, maxPoints - 1)

    local bars = List()
    dataset.points.forEach((point, pointIdx) => {
        if (pointIdx < threshold) {
            local y = point.y * plotHeight / 100

            local y1 = min(y, yCenter)
            local y2 = max(y, yCenter)
            local h = y2 - y1

            bars.add(Area(
                point.x * plotWidth / 100 + barWidth * datasetIdx,
                y1,
                barWidth,
                h
            ))
        }
    })

    BarDataset(dataset.args, bars)
})







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

local plot = findChildItemsByTag('chart-plot').find((x) => { x.getShape() == 'path' })
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