

/**
 * A point on svg path, contains coords + distance on the path that was can be used to calculate this point again
 * @typedef {Object} SVGPathPoint
 * @property {number} x - x coordinate
 * @property {number} y - y coordinate
 * @property {number} distance - distance on the SVG path
 */

/**
 * @typedef {Object} Point
 * @property {number} x - x coordinate
 * @property {number} y - y coordinate
 */

/**
 * @typedef {Object} Area
 * @property {number} x - x coordinate
 * @property {number} y - y coordinate
 * @property {number} w - width
 * @property {number} h - height
 * @property {number} r - rotation in degrees
 * @property {string} type - type of transform: 'relative' or 'viewport'
 */


/**
 * A context that is used to determine what kind of operations were done to an item
 * @typedef {Object} ItemModificationContext
 * @property {String} id - unique context it. It is used so that Curve shape is able to remember initial curve point and store it in its cache temporarily.
 * @property {Boolean} moved - specifies whether item was moved
 * @property {Boolean} rotated - specifies whether item was rotated
 * @property {Boolean} resized - specifies whether item was resized
 */


/**
 * @typedef {Object} MultiItemEditBox
 * @property {String} id - unique id of edit box
 * @property {Array} items - array of items that are selected for this edit box
 * @property {Area}  area  - area of edit box
 * @property {Object} itemData  - map of item ids to custom data that is used by edit box (e.g. items originalArea, originalCurvePoints)
 * @property {Object} itemProjections - map of item ids to item projections
 * @property {String} transformType - type of transform: relative or viewport
 */


/**
 * @typedef {Object} ItemBehavior
 * @property {Array} events
 */

/**
 * @typedef {Object} Item
 * @property {String} id 
 * @property {String} name 
 * @property {String} description
 * @property {Area}   area
 * @property {String} shape
 * @property {String} blendMode
 * @property {Object} shapeProps
 * @property {Number} opacity
 * @property {Array}  links
 * @property {Object} textSlots
 * @property {ItemBehavior} behavior
 */


/**
 * @interface SchemeContainer
 */
/**
 * @function
 * @name SchemeContainer#addItem
 * @param {Item} item
 */


 /**
  * @typedef {Object} ScreenTransform
  * @property {Number} x - offset on X axis
  * @property {Number} y - offset on Y axis
  * @property {Number} scale - scale of the zoom where 1.0 is normal zoom.
  */