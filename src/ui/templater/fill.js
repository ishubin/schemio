

export const Fill = {

    /**
     * @param {String} encodedColor
     * @returns {AdvancedColor}
     */
    solid(encodedColor) {
        return {
            type: 'solid',
            color: encodedColor
        };
    },

    /**
     * @returns {AdvancedColor}
     */
    none() {
        return {
            type: 'none',
        };
    },

    /**
     * @returns {AdvancedColor}
     */
    image(imageUrl, stretch = false, x = 0, y = 0, w = 1, h = 1) {
        return {
            type: 'image',
            image: imageUrl,
            stretch,
            imageBox: {x, y, w, h},
        };
    },

    /**
     * @param  {...any} args
     * @returns {AdvancedColor}
     */
    radialGradient(...args) {
        return {
            type: 'gradient',
            gradient: {
                type: 'radial',
                colors: gradientColorsFromArgs(args),
            }
        }
    },

    /**
     * @param {Number} angle
     * @param  {...any} args
     * @returns {AdvancedColor}
     */
    linearGradient(angle, ...args) {
        return {
            type: 'gradient',
            gradient: {
                type: 'linear',
                direction: angle,
                colors: gradientColorsFromArgs(args),
            }
        }
    }

};



function gradientColorsFromArgs(args) {
    const colors = [];
    for (let i = 0; i < args.length; i += 2) {
        if (i+1 < args.length) {
            colors.push({
                p: args[i],
                c: args[i+1]
            });
        }
    }

    return colors;
}