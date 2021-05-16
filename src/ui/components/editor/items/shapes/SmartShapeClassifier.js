import forEach from 'lodash/forEach';
import filter from 'lodash/filter';
import map from 'lodash/map';
import myMath from '../../../../myMath';
import utils from '../../../../utils';

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


function checkRect(points, curvesInfo) {
    let score = 0;
    if (curvesInfo.length === 1) {
        const bigAngles = filter(curvesInfo[0].angles, angle => Math.abs(angle) > 40);
        if (bigAngles.length < 5) {
            let angleScore = 0;
            if (isSameOrientation(bigAngles)) {
                forEach(bigAngles, angle => {
                    angleScore += Math.abs(angle) / 90;
                });
                score = angleScore / 4;
            }
        }
    }
    return {
        score,
        shape: 'rect'
    };
}


function checkEllipse(points, curvesInfo) {
    let score = 0;
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
        const min = Math.min(leftAngles);
        const max = Math.min(rightAngles);
        if ((max - min) / (leftAngles + rightAngles) > 0.7) {
            score = (leftAngles + rightAngles - largeAngles) / (leftAngles + rightAngles);
        }
    }

    return {
        score,
        shape: 'ellipse'
    };
}

function checkTriangle(points, curvesInfo) {
    let score = 0;
    if (curvesInfo.length === 1 && curvesInfo[0].angles.length > 2) {
        const sortedAngles = utils.clone(curvesInfo[0].angles);
        sortedAngles.sort((a,b) => b - a);
        
        if (sortedAngles.length === 3 || (sortedAngles.length > 3 && Math.abs(sortedAngles[3]) < 25)) {
            let angleSum = 0;
            for (let i = 0; i < sortedAngles.length && i < 3; i++) {
                angleSum += sortedAngles[i];
            }

            score = Math.abs(angleSum) / 180;
        }
    }
    return {
        score,
        shape: 'basic_triangle'
    };
}

const shapeClassifiers = [
    checkRect,
    checkEllipse,
    checkTriangle
];


function analyzeSingleCurve(points) {

    const angles = [];
    
    for (let i = 1; i < points.length - 1; i++) {
        const prevPoint = points[i - 1];
        const point = points[i];
        const nextPoint = points[i + 1];
        const Ax = prevPoint.x - point.x;
        const Ay = prevPoint.y - point.y;
        const Bx = nextPoint.x - point.x;
        const By = nextPoint.y - point.y;

        angles.push(myMath.angleBetweenVectors(Ax, Ay, Bx, By) * 180 / Math.PI);
    }
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    //TODO calculate it in percentage of the shape size, not absolute
    const proximityMax = 40;
    const dSquared = (firstPoint.x - lastPoint.x)*(firstPoint.x - lastPoint.x) + (firstPoint.y - lastPoint.y)*(firstPoint.y - lastPoint.y);

    if (dSquared < proximityMax*proximityMax && points.length > 2) {
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
    }

    return {
        angles
    }
}

function analyzeCurve(points) {

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
    
    return map(curves, analyzeSingleCurve);
}

export function identifyShape(points) {
    let maxScore = 0;
    let bestResult = null;

    const curvesInfo = analyzeCurve(points);
    
    console.log('curvesInfo', JSON.stringify(curvesInfo));

    forEach(shapeClassifiers, shapeClassifier => {
        const result = shapeClassifier(points, curvesInfo);
        if (result.score > maxScore) {
            bestResult = result;
        }
    });
    return bestResult;
}