local BASE_SCRIPT = enc {
struct Label {
    id: ""
    text: ""
    x: 0
    y: 0
    w: 0
    h: 0
    fontSize: 14
    opacity: 100
    sliceIdx: 0
}

struct PieSlice {
    id: ""
    idx: 0
    name: ""
    value: 0
    percent: 10
    color: "#ff00ff"
    angle: 0
    labels: List()
}

func alignSlices(slices, initialAngle, shouldSort) {
    local total = 0

    slices.forEach((slice, idx) => {
        total += slice.value
    })

    if (total < 0.0000001) {
        total = 0.0000001
    }

    slices.forEach((slice, idx) => {
        slice.percent = slice.value * 100 / total
    })

    if (shouldSort) {
        slices.sort((a, b) => {
            b.percent - a.percent
        })
    }

    local allPrevPercents = 0
    slices.forEach((slice) => {
        local percent = slice.percent
        slice.angle = initialAngle + 360 * allPrevPercents / 100

        allPrevPercents += percent
    })
}

func buildSliceLabels(slices, chartX, chartY, chartWidth, chartHeight) {
    local labels = List()
    local r = min(chartWidth, chartHeight) / 2
    local lever = r * labelDistance/100
    if (lever < 50) {
        lever = r * 0.5
    }
    slices.forEach((slice) => {
        local nicePercent = round(slice.percent)
        local labelText = "" + slice.value
        if (labelDisplay == '%') {
            labelText = `${nicePercent}%`
        } else if (labelDisplay == 'value (%)') {
            labelText = `${slice.value} (${nicePercent}%)`
        } else if (labelDisplay == '% (value)') {
            labelText = `${nicePercent}% (${slice.value})`
        }
        local size = calculateTextSize(labelText, labelFont, labelFontSize)
        local arcSize = 2 * PI() * lever * slice.percent / 100
        local avgLabelSize = (size.w + size.h) / 2
        local opacity = if (arcSize > avgLabelSize) { 100 } else { 0 }
        local midAngle = (270 + slice.angle + (slice.percent / 2) * 360 / 100) * PI() / 180
        local cx = cos(midAngle) * lever
        local cy = sin(midAngle) * lever
        local w = size.w * 1.3
        local h = size.h * 1.3
        local x = cx - w/2 + chartX + chartWidth/2
        local y = cy - h/2 + chartY + chartHeight/2
        labels.add(Label(`slice-label-percent-${slice.id}`, labelText, x, y, w, h, labelFontSize, opacity, slice.idx))
    })
    labels
}
} // end of baseScript


struct Legend {
    x: 0
    y: 0
    w: 0
    h: 0
    entries: List()
}

struct LegendEntry {
    id: ""
    x: 0
    y: 0
    w: 0
    h: 0
    name: ""
    color: "#FF00FFFF"
}


func buildLegend(data) {
    local maxWidth = 0
    local maxHeight = 0
    local entries = data.map((entry) => {
        local size = calculateTextSize(entry.name, legendFont, legendFontSize)
        local w = size.w * 1.3
        local h = size.h * 1.3
        maxWidth = max(maxWidth, w)
        maxHeight = max(maxHeight, h)
        LegendEntry(entry.id, 0, 0, w, h, entry.name, entry.color)
    })

    local legendWidth = min(width/2, maxWidth + iconSize + 10)
    local legendHeight = min(height, (maxHeight + legendSpacing * 2) * data.size)

    entries.forEach((entry, idx) => {
        entry.y = (maxHeight + legendSpacing * 2) * idx
        entry.h = maxHeight + legendSpacing * 2
    })

    Legend(width - legendWidth - padding, height/2 - legendHeight/2, legendWidth, legendHeight, entries)
}


func dataToSlices(data) {
    data.map((entry, idx) => {
        PieSlice(
            entry.id,
            idx,
            entry.name,
            entry.value,
            0, // percent
            entry.color,
            0 // angle
        )
    })
}

local slices = dataToSlices(data)
alignSlices(slices, initialAngle, true)

local legend = if (hasLegend) { buildLegend(data) } else { Legend() }

local chartWidth = max(1, width - legend.w - padding*2)
if (hasLegend) {
    chartWidth = max(1, chartWidth - padding)
}
local chartHeight = max(1, height - padding*2)
local sliceLabels = if (hasLabels) { buildSliceLabels(slices, padding, padding, chartWidth, chartHeight) } else { List() }

