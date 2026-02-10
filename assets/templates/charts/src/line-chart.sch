legendTop = 0
legendWidth = width - padding * 2
legendTopMargin = 10
legend = Legend()
gridPaths = List()
plotOffset = padding
plotWidth = max(1, width - padding*2)
plotHeight = max(1, height - padding*2)

xLabelsFullHeight = 20

local labelsGap = 15
local labelIconWidth = 20
local minSpacing = 50



struct Dataset {
    args: 0
    points: List()
}


if (hasLegend) {
    legend = buildLegend(datasets, legendWidth, legendTopMargin)
}



func parseDatasetPoints(encodedPoints, yAxis, plotWidth, plotHeight) {
    local dx = plotWidth * xStep / max(0.000001, xMax - xMin)
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


plotHeight = max(1, height - padding*2 - legend.h)

// Calculate how many ticks can fit with the minimum spacing
local maxTicks = floor(plotHeight / minSpacing)
local yAxis = generateYAxis(yMin, yMax, max(2, maxTicks), font, fontSize)


plotOffset = 0
yAxis.labels.forEach((label) => {
    plotOffset = max(plotOffset, label.w)
})

plotOffset += padding

yAxis.labels.forEach((label) => { label.w = plotOffset })

plotWidth = max(1, width - plotOffset - padding)

local xAxis = generateXAxis(xMin, xMax, xStep, plotOffset, plotWidth, plotHeight, font, fontSize)

xAxis.labels.forEach((label) => {
    xLabelsFullHeight = max(xLabelsFullHeight, label.h)
})

plotHeight = max(1, height - xLabelsFullHeight - legend.h - padding)
yAxis.labels.forEach((label) => { label.y = padding + label.y * plotHeight / 100 - label.h / 2 })
xAxis.labels.forEach((label) => { label.y = padding + plotHeight })

legendTop = xLabelsFullHeight + plotHeight + padding

// generating plot grid paths
yAxis.lines.forEach((line) => {
    gridPaths.add(Path(List(Point(0, line.position), Point(100, line.position))))
})
xAxis.lines.forEach((line) => {
    gridPaths.add(Path(List(Point(line.position, 0), Point(line.position, 100))))
})


parsedDatasets = datasets.map((dataset) => {
    Dataset(dataset, parseDatasetPoints(dataset.values, yAxis, plotWidth, plotHeight))
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