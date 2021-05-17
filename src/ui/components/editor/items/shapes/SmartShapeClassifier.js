import forEach from 'lodash/forEach';
import filter from 'lodash/filter';
import map from 'lodash/map';
import myMath from '../../../../myMath';

function createLineAnalysis(p1, p2, bbox) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    let isVertical = false;
    let isHorizontal = false;
    let isFull = false;
    if (bbox.w > 1) {
        if (Math.abs(dx / bbox.w) < 0.1 || Math.abs(dx) < 30) {
            isVertical = true;
            if (bbox.h > 1 && Math.abs(dy / bbox.h) >= 0.7) {
                isFull = true;
            }
        }
    }

    if (bbox.h > 1) {
        if (Math.abs(dy / bbox.h) < 0.1 || Math.abs(dy) < 30) {
            isHorizontal = true;
            if (bbox.w > 1 && Math.abs(dx / bbox.w) >= 0.7) {
                isFull = true;
            }
        }
    }

    if (!isVertical && !isHorizontal) {
        const lengthSquared = dx * dx + dy * dy;
        if (lengthSquared > 1) {
            length = Math.sqrt(lengthSquared);
            const averageSize = (bbox.w + bbox.h) / 2;
            if (averageSize > 1) {
                isFull = length / averageSize > 0.7;
            }
        }
    }

    return {
        isVertical,
        isHorizontal,
        isFull,
        p1, p2
    };
}

function analyzeSingleCurve(points, bbox) {

    const angles = [];

    const simpleLinePoints = [points[0]];
    
    for (let i = 1; i < points.length - 1; i++) {
        const prevPoint = points[i - 1];
        const point = points[i];
        const nextPoint = points[i + 1];
        const Ax = prevPoint.x - point.x;
        const Ay = prevPoint.y - point.y;
        const Bx = nextPoint.x - point.x;
        const By = nextPoint.y - point.y;
        
        const angle = myMath.angleBetweenVectors(Ax, Ay, Bx, By) * 180 / Math.PI;
        if (Math.abs(angle) > 30) {
            simpleLinePoints.push(point);
        }
        angles.push(angle);
    }


    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    const averageCurveSize = (bbox.w + bbox.h ) / 2;
    const proximityMax = averageCurveSize / 7;

    const dSquared = (firstPoint.x - lastPoint.x)*(firstPoint.x - lastPoint.x) + (firstPoint.y - lastPoint.y)*(firstPoint.y - lastPoint.y);
    let isJoined = dSquared < proximityMax*proximityMax && points.length > 2;
    
    if (isJoined) {
        // treat it like it can merge its points and add another angle
        const prevPoint = points[points.length - 2];
        const point = {
            x: (firstPoint.x + lastPoint.x) / 2,
            y: (firstPoint.y + lastPoint.y) / 2
        }
        const nextPoint = points[1];
        const Ax = prevPoint.x - point.x;
        const Ay = prevPoint.y - point.y;
        const Bx = nextPoint.x - point.x;
        const By = nextPoint.y - point.y;
        angles.push(myMath.angleBetweenVectors(Ax, Ay, Bx, By) * 180 / Math.PI);

        simpleLinePoints.push(lastPoint);
    }


    const simpleLines = [];
    
    let verticalFullLines = 0;
    let horizontalFullLines = 0;
    let totalFullLines = 0;
    if (simpleLinePoints.length > 1) {
        for (let i = 1; i < simpleLinePoints.length; i++) {
            const line = createLineAnalysis(simpleLinePoints[i-1], simpleLinePoints[i], bbox);

            if (line.isFull) {
                totalFullLines += 1;
            }

            if (line.isFull && line.isHorizontal) {
                horizontalFullLines += 1;
            }
            if (line.isFull && line.isVertical) {
                verticalFullLines += 1;
            }
            simpleLines.push(line);
        }
    }

    return {
        isJoined,
        angles,
        simpleLines,
        verticalFullLines,
        horizontalFullLines,
        totalFullLines,
    };
}


function getBbox(points) {
    let minX = points[0].x;
    let minY = points[0].y;
    let maxX = points[0].x;
    let maxY = points[0].y;
    forEach(points, (point, i) => {
        if (minX > point.x) {
            minX = point.x;
        }
        if (minY > point.y) {
            minY = point.y;
        }
        if (maxX < point.x) {
            maxX = point.x;
        }
        if (maxY < point.y) {
            maxY = point.y;
        }
    });

    return {
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
    }
}

function analyzeCurve(points, bbox) {
    let currentCurvePoints = [];
    const curves = []
    curves.push(currentCurvePoints);

    forEach(points, (point, i) => {
        if (point.break) {
            currentCurvePoints = [];
            curves.push(currentCurvePoints);
        }
        currentCurvePoints.push(point);
    });
    
    return map(curves, curvePoints => analyzeSingleCurve(curvePoints, bbox));
}


function isSameOrientation(angles) {
    let sign = 0;
    let sameOrientation = true;

    forEach(angles, angle => {
        if (angle > 0) {
            if (sign === 0) {
                sign = 1;
            } else if (sign !== 1) {
                sameOrientation = false;
            }
        } else {
            if (sign === 0) {
                sign = -1;
            } else if (sign !== -1){
                sameOrientation = false;
            }
        }
    });
    return sameOrientation;
}

/*
rect classification:
- has 4 90 degree angles in the same orientation
- 5th largest angle should be less than 30 degrees
- should have first and last point close to each other
- has 2 vertical lines
- has 2 horizontal lines
*/

/*
ellipse classification:
- majority of angles are of the same orientation
- majority of angles are 5 < 35 degrees
- majority of points are away from the center
- has no simple lines
*/

/*
triangle classification:
- has 3 large angles of the same orientation
- sum of 3 large angles should equal to 180
- the 4th largest angle should be less than 30 degrees
- should have first and last point close to each other
*/

/*
diamond classification:
- has 4 90 degree angles in the same orientation
- 5th largest angle should be less than 30 degrees
- should have first and last point close to each other
- has 2 diagonal lines in one direction
- has 2 diagonal lines in another direction
*/


class WeightedScore {
    constructor() {
        this.items = [];
    }

    add(weight, value) {
        this.items.push({
            weight, value
        });
        return this;
    }

    getScore() {
        let totalWeight = 0;
        let totalValue = 0;
        forEach(this.items, item => {
            totalWeight += item.weight;
            totalValue += item.weight * item.value;
        });
        
        if (totalWeight > 0) {
            return totalValue / totalWeight;
        }
        return 0;
    }
}


function checkRect(points, curvesInfo) {
    
    let angleScore = 0;
    if (curvesInfo.length === 1) {
        const bigAngles = filter(curvesInfo[0].angles, angle => Math.abs(angle) > 40);
        if (bigAngles.length < 5) {
            if (isSameOrientation(bigAngles)) {
                forEach(bigAngles, angle => {
                    angleScore += Math.abs(angle) / 90;
                });
                angleScore = angleScore / 4;
            }
        }
    }

    return {
        score: new WeightedScore()
            .add(2, angleScore)
            .add(2, curvesInfo[0].isJoined ? 1: -0.4)
            .add(1, curvesInfo[0].horizontalFullLines == 2 ? 1: 0)
            .add(1, curvesInfo[0].verticalFullLines == 2 ? 1: 0)
            .getScore(),
        shape: 'rect'
    };
}


function checkEllipse(points, curvesInfo) {
    let angleScore = 0;
    if (curvesInfo.length === 1 && curvesInfo[0].angles.length > 6) {
        let leftAngles = 0;
        let rightAngles = 0;
        let largeAngles = 0;
        forEach(curvesInfo[0].angles, angle => {
            if (angle < 0) {
                leftAngles++;
            } else {
                rightAngles++;
            }

            if (Math.abs(angle) > 40) {
                largeAngles++;
            }
        });

        // checking that majority of angles are in the same direction
        const min = Math.min(leftAngles, rightAngles);
        const max = Math.max(leftAngles, rightAngles);
        if ((max - min) / (leftAngles + rightAngles) > 0.7) {
            angleScore = (leftAngles + rightAngles - largeAngles) / (leftAngles + rightAngles);
        }
    }

    return {
        score: new WeightedScore()
            .add(2, angleScore)
            .add(1, curvesInfo[0].isJoined ? 1: -0.4)
            .add(1, curvesInfo[0].horizontalFullLines == 0 ? 0.5: -0.2)
            .add(1, curvesInfo[0].verticalFullLines == 0 ? 0.5: -0.2)
            .getScore(),
        shape: 'ellipse'
    };
}

function checkTriangle(points, curvesInfo) {
    let angleScore = 0;
    if (curvesInfo.length === 1 && curvesInfo[0].angles.length > 2) {
        const bigAngles = filter(curvesInfo[0].angles, angle => Math.abs(angle) > 40);
        if (bigAngles.length < 4) {
            let angleSum = 0;
            if (isSameOrientation(bigAngles)) {
                forEach(bigAngles, angle => {
                    angleSum += Math.abs(angle);
                });

                angleScore = myMath.clamp(1 - (angleSum - 180) / 180, 0, 1);
            }
        }
    }

    return {
        score: new WeightedScore()
            .add(6, angleScore)
            .add(3, curvesInfo[0].totalFullLines === 3 ? 1: -1)
            .add(2, curvesInfo[0].isJoined ? 1: -1)
            .add(1, curvesInfo[0].horizontalFullLines < 2 ? 1: -0.5)
            .add(1, curvesInfo[0].verticalFullLines < 2 ? 1: -0.5)
            .getScore(),
        shape: 'basic_triangle'
    };
}

const shapeClassifiers = [
    checkRect,
    checkEllipse,
    checkTriangle
];


/**
 * Tries to bring curve to 200x200 area
 * 
 * @param {*} points 
 * @param {*} bbox 
 * @returns 
 */
function normalizePoints(points, bbox) {
    const targetWidth = 200;
    const targetHeight = 200;
    if (bbox.w > 10 && bbox.h > 10) {
        const Rw = targetWidth / bbox.w;
        const Rh = targetHeight / bbox.h;

        const newPoints = [];
        forEach(points, point => {
            newPoints.push({
                x: (point.x - bbox.x) * Rw,
                y: (point.y - bbox.y) * Rh,
                break: point.break
            });
        });

        return {
            points: newPoints,
            bbox: {
                x: 0,
                y: 0,
                w: targetWidth,
                h: targetHeight,
            }
        };
    }

    return {
        points,
        bbox
    };
}


export function identifyShape(points) {
    let maxScore = 0;
    let bestResult = null;

    const normalized = normalizePoints(points, getBbox(points));

    const curvesInfo = analyzeCurve(normalized.points, normalized.bbox);
    console.log(JSON.stringify(curvesInfo));
    
    forEach(shapeClassifiers, shapeClassifier => {
        const result = shapeClassifier(normalized.points, curvesInfo);
        console.log(JSON.stringify(result));
        if (result.score > maxScore) {
            bestResult = result;
            maxScore = result.score;
        }
    });
    return bestResult;
}