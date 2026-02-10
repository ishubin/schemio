struct Path {
    points: List()
    closed: false
    pos: 'relative'
}

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

struct LegendLabel {
    index: 0
    name: ""
    color: "#ff00ffff"
    x: 0
    y: 0
    w: 1
    h: 1
}

struct Legend {
    w: 0
    h: 0
    labels: List()
}

struct AxisLabel {
    text: ""
    x: 0
    y: 0
    w: 100
    h: 50
}

struct AxisLine {
    value: 0
    position: 0
    labelText: ""
}

struct Axis {
    lines: List()
    min: 0
    max: 100
    step: 10
    labels: List()
}

func generateYAxis(softMin, softMax, numTicks, font, fontSize) {
    numTicks = max(2, numTicks)
    // Calculate a nice step size
    local range = softMax - softMin
    local roughStep = range / (numTicks - 1)

    // Find a "nice" step size (1, 2, 5, 10, 20, 50, 100, etc.)
    local magnitude = 10 ^ floor(log10(roughStep))
    local normalized = roughStep / magnitude

    local niceStep = 1
    if (normalized < 1.5) {
        niceStep = magnitude
    } else if (normalized < 3.5) {
        niceStep = 2 * magnitude
    } else if (normalized < 7.5) {
        niceStep = 5 * magnitude
    } else {
        niceStep = 10 * magnitude
    }

    // Find nice min and max
    local niceMin = floor(softMin / niceStep) * niceStep
    local niceMax = ceil(softMax / niceStep) * niceStep

    local range = abs(niceMax - niceMin)

    // Generate grid lines
    local lines = List()
    for (local value = niceMin; value <= niceMax; value += niceStep) {
        // Normalize position to 0-100% range (0 = bottom, 100% = top)
        local position = 100 - 100 * (value - niceMin) / max(1, (niceMax - niceMin))

        lines.add(AxisLine(value, position, formatLabel(value, range)))
    }

    Axis(lines, niceMin, niceMax, niceStep, generateYAxisLabels(lines, font, fontSize))
}

func generateYAxisLabels(lines, font, fontSize) {
    local labels = List()
    lines.forEach((line) => {
        local size = calculateTextSize(line.labelText, font, fontSize)
        size.w *= 1.1
        size.h *= 2.2

        labels.add(AxisLabel(line.labelText, 0, line.position,  size.w, size.h))
    })
    labels
}

local minPixelDistance = 40


func generateXAxis(xMin, xMax, xStep, plotOffset, plotWidth, plotHeight, font, fontSize) {
    local dataRange = max(0.00001, xMax - xMin)
    local pixelsPerUnit = plotWidth / dataRange
    local pixelsPerStep = xStep * pixelsPerUnit

    // If the current step is already large enough, use it
    if (pixelsPerStep >= minPixelDistance) {
        return _generateXAxis(xMin, xMax, xStep, plotOffset, plotWidth, plotHeight, font, fontSize)
    } else {
        local minMultiplier = ceil(minPixelDistance / pixelsPerStep)
        local optimizedStep = xStep * minMultiplier
        _generateXAxis(xMin, xMax, optimizedStep, plotOffset, plotWidth, plotHeight, font, fontSize)
    }
}

func _generateXAxis(xMin, xMax, xStep, plotOffset, plotWidth, plotHeight, font, fontSize) {
    local lines = List()

    local range = abs(xMax - xMin)

    for (local value = xMin; value <= xMax; value += xStep) {
        // Normalize position to 0-100 range (0 = left, 100% = right)
        local position = 100 * (value - xMin) / (xMax - xMin)

        lines.add(AxisLine(value, position, formatLabel(value, range)))
    }

    Axis(lines, xMin, xMax, xStep, generateXAxisLabels(lines, plotOffset, plotWidth, plotHeight, font, fontSize))
}

func generateXAxisLabels(lines, plotOffset, plotWidth, plotHeight, font, fontSize) {
    local labels = List()
    lines.forEach((line, idx) => {
        local size = calculateTextSize(line.labelText, line.position * plotWidth / 100, plotHeight, font, fontSize)
        size.w *= 1.1
        size.h *= 2.2
        local x = if (idx == 0) {
            plotOffset + line.position * plotWidth / 100
        } else if (idx < lines.size - 1) {
            plotOffset + line.position * plotWidth / 100 - size.w / 2
        } else {
            plotOffset + plotWidth - size.w
        }
        labels.add(AxisLabel(line.labelText, x, plotHeight, size.w, size.h))
    })
    labels
}

func formatLabel(value, range) {
    // Handle zero
    if (value == 0) {
        return '0'
    }

    // For very small or very large numbers, use scientific notation
    local absValue = abs(value)
    if (absValue < 0.001 || absValue > 1000000) {
        return value.toExponential(2)
    }

    // Determine decimal places needed based on the range
    local decimalPlaces = 0
    if (range < 0.01) {
        decimalPlaces = 6
    } else if (range < 0.1) {
        decimalPlaces = 4
    } else if (range < 1) {
        decimalPlaces = 3
    } else if (range < 10) {
        decimalPlaces = 2
    } else if (range < 100) {
        decimalPlaces = 1
    }

    // Format and remove trailing zeros
    parseFloat(value.toFixed(decimalPlaces)).toString()
}


func buildLegend(datasets, legendWidth, legendTopMargin) {
    local maxTextHeight = -1
    local legendLabels = List()

    local freeSlotWidth = legendWidth
    local freeSlotY = 0
    local freeSlotX = 0

    if (datasets.size == 0) {
        return Legend()
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
            label.y = freeSlotY + legendTopMargin

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
                label.y = freeSlotY + legendTopMargin

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
                label.y = freeSlotY + legendTopMargin

                legendLabels.add(label)
                allLabels.shift()

                freeSlotX += labelIconWidth + label.w + labelsGap
                freeSlotWidth = legendWidth - freeSlotX
            }
        }
    }

    local legendHeight = min(height/2, legendTopMargin + freeSlotY + maxTextHeight + 5)

    Legend(legendWidth, legendHeight, legendLabels)
}