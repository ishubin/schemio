plotWidth = max(1, width - 20)
plotHeight = max(1, height - 20)
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
            local p1 = if (idx > 0) { points.get(idx - 1) } else { p }
            local p2 = if (idx < points.size - 1) { points.get(idx + 1) } else { p }
            local v = Vector(p2.x, p2.y) - Vector(p1.x, p1.y)
            v = v.normalized() * dx / 2

            local x1 = -v.x * 100 / plotWidth
            local y1 = -v.y * 100 / plotHeight
            local x2 = v.x * 100 / plotWidth
            local y2 = v.y * 100 / plotHeight
            SmoothPoint(p.x, p.y, x1, y1, x2, y2)
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
        local p1 = if (idx > 0) { points.get(idx - 1) } else { p }
        local p2 = if (idx < points.size - 1) { points.get(idx + 1) } else { p }
        local v = Vector(p2.x, p2.y) - Vector(p1.x, p1.y)
        v = v.normalized() * dx / 2

        p.x1 = -v.x
        p.y1 = -v.y
        p.x2 = v.x
        p.y2 = v.y
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