---
name: schemioscript
description: Create and analyze SchemioScript code
license: Mozilla Public License Version 2.0
metadata:
  author: Ivan Shubin
  version: 1.0.0
---

# SchemioScript Language Skill

## Overview

SchemioScript is a JavaScript-like scripting language designed for Schemio diagrams. It enables dynamic behavior, item manipulation, and complex interactions within diagram items.

**Key Characteristics:**
- JavaScript-like syntax with simplifications
- Dynamically typed
- Expression-oriented (last statement is return value)
- No explicit variable declaration keywords (except `let` for local scoping)
- Designed for diagram item scripting and templating

---

## Basic Syntax

### Variable Declaration
No `const`, `let`, or `var` keywords required. Simply assign a value:

```js
name = "John"
age = 19
x = 4 + 5 * 4 + y
```

### Multiple Statements
Separated by semicolon `;` or newline:

```js
x = 1; y = 2; z = x + y

// Or over multiple lines
a = 4 +
5 * 4 + y
% 3
```

### Expression Return Value
Only the last statement in an expression is considered the return value:

```js
// This returns 30
x = (a = 1; b = 2; a + b); x*10
```

---

## Data Types

### Primitives
- **Number**: `42`, `3.14`, `-10`
- **String**: `'hello'`, `"world"`
- **Boolean**: `true`, `false`
- **Null**: `null`

### Complex Types
- **Vector**: 2D vector with `x` and `y` properties
- **List**: Ordered collection (similar to arrays)
- **Map**: Key-value pairs (hash table)
- **Set**: Collection of unique values
- **Struct**: Custom complex objects

---

## Operators

### Arithmetic
| Operator | Name | Example |
|----------|------|---------|
| `+` | Addition | `a + b` |
| `-` | Subtraction | `a - b` |
| `*` | Multiplication | `a * b` |
| `/` | Division | `a / b` |
| `%` | Modulo | `a % b` |
| `^` | Power | `a ^ b` (a to the power of b) |

### Comparison
| Operator | Name | Example |
|----------|------|---------|
| `==` | Equal | `x == y` |
| `!=` | Not equal | `x != y` |
| `>` | Greater than | `x > y` |
| `<` | Less than | `x < y` |
| `>=` | Greater than or equal | `x >= y` |
| `<=` | Less than or equal | `x <= y` |

### Logical
| Operator | Name | Example |
|----------|------|---------|
| `&&` | AND | `x > 0 && y < 10` |
| `||` | OR | `x > 0 || y < 10` |
| `!` | NOT | `!(x > 0)` |

### Bitwise
| Operator | Name | Example |
|----------|------|---------|
| `&` | AND | `a & b` |
| `|` | OR | `a | b` |
| `~` | NOT | `~a` |
| `<<` | Left shift | `a << b` |
| `>>` | Right shift | `a >> b` |

### Assignment
| Operator | Name | Example |
|----------|------|---------|
| `=` | Assign | `x = 5` |
| `+=` | Add and assign | `x += 5` |
| `-=` | Subtract and assign | `x -= 5` |
| `*=` | Multiply and assign | `x *= 5` |
| `/=` | Divide and assign | `x /= 5` |

### Increment/Decrement
| Operator | Name | Example |
|----------|------|---------|
| `++` | Increment | `x++` or `++x` |
| `--` | Decrement | `x--` or `--x` |

**Note:** Pre-increment (`++x`) and post-increment (`x++`) are supported.

---

## Control Structures

### If Statements

If statements can be used as expressions and return the last executed statement:

```js
x = 5
y = 3
result = 1

if (z == 0) {
    result = x + y
} else if (z == 1) {
    result = x * y
} else {
    result = x - y
}
```

As an expression:

```js
x = getPosX()
x = if (x < 100) {
    step = 4
    x + step
} else { 0 }
```

### While Loops

```js
i = 0
sum = 0
while (i < 10) {
    sum += i
    i += 1
}
```

### For Loops

C-like for loops:

```js
for (i = 0; i < 5; i++) {
    log(i)
}
```

Multiple initializations:
```js
for (i = 0, j = 10; i < j; i++, j--) {
    log(i, j)
}
```

---

## Templated Strings

Use backticks to embed expressions in strings:

```js
setTextColor('body', `rgba(${r + 10}, ${g}, 20, 0.5)`)
```

---

## Item Referencing

Reference other diagram items using the `@` symbol:

```js
// Reference by name
pos = @Rect.getWorldPos()
@Rect.setWorldPos(pos.x + 20, pos.y - 10)

// Reference with special characters (use quotes)
pos = @"Rect 2".getWorldPos()
@"Rect 2".setWorldPos(pos.x + 20, pos.y - 10)

// Dynamic item referencing with templated strings
for (i = 1; i < 10; i++) {
    pos = @`Rect ${i}`.getWorldPos()
    @`Rect ${i}`.setWorldPos(pos.x + 20, pos.y - 10)
}
```

---

## Vector Type

2D vector for geometric calculations:

### Creating Vectors
```js
v1 = Vector(3, 4)
v2 = Vector(1, -2)
```

### Vector Properties
- `x`: X coordinate
- `y`: Y coordinate

### Vector Operations
```js
dx = v1.x - v2.x
dv = v1 - v2         // Vector subtraction
v3 = v1 + v2         // Vector addition
v4 = v1 * 10        // Scalar multiplication
v5 = v1 / 2         // Scalar division
v6 = 5 * v1         // Scalar on left side
```

### Vector Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `length()` | Returns the magnitude/length of the vector | Number |
| `normalized()` | Returns a unit vector in the same direction | Vector |
| `projection(v)` | Returns scalar projection of this vector onto vector `v` | Number |
| `rotate(angle)` | Returns vector rotated by `angle` radians | Vector |
| `inverse()` | Returns the negated vector | Vector |

### Examples
```js
v = Vector(3, 5)
d = v.length()
normal = v.normalized()

v1 = Vector(1, 3)
v2 = Vector(4, 1)
p = v1.projection(v2)  // Scalar projection

v = Vector(2, 7)
v2 = v.rotate(PI() / 2)  // Rotate by 90 degrees

v = Vector(2, 7)
v_inv = v.inverse()  // Returns Vector(-2, -7)
```

---

## List Type

Ordered collection similar to arrays:

### Creating Lists
```js
items = List(4, 5, 2)
emptyList = List()
```

### List Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `add(item)` | Adds item to end of list | List (chained) |
| `remove(index)` | Removes item at index | List (chained) |
| `get(index)` | Gets item at index | Any |
| `set(index, value)` | Sets item at index | List (chained) |
| `insert(index, value)` | Inserts value at index | List (chained) |
| `size` | Number of items | Number |
| `findIndex(callback)` | Finds index of first matching element | Number (-1 if not found) |
| `forEach(callback)` | Iterates all items | void |
| `map(callback)` | Maps items to new values | List |
| `filter(predicate)` | Filters items | List |
| `pop()` | Removes and returns last item | Any |
| `shift()` | Removes and returns first item | Any |
| `first()` | Returns first item | Any |
| `last()` | Returns last item | Any |
| `extendList(otherList)` | Appends all items from another list | void |

### Examples
```js
items = List('a', 'b', 'c')
items.add('d')
items.remove(1)  // Removes 'b'
item1 = items.get(0)  // 'a'

// Iteration
items.forEach((item, index) => {
    log(index, item)
})

// Mapping
numbers = List(1, 2, 3)
doubled = numbers.map((value, index) => { value * 2 })

// Filtering
filtered = numbers.filter((value) => { value > 1 })

// Find index
idx = items.findIndex((item) => { item == 'b' })
```

---

## Map Type

Hash table for key-value pairs:

### Creating Maps
```js
m = Map('name', 'John', 'age', 30)
emptyMap = Map()
```

### Map Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `get(key)` | Gets value for key | Any |
| `set(key, value)` | Sets value for key | void |
| `has(key)` | Checks if key exists | Boolean |
| `delete(key)` | Removes key-value pair | void |
| `forEach(callback)` | Iterates all entries | void |

### Examples
```js
m = Map('name', 'John', 'age', 30)
log('Name:', m.get('name'))
m.set('age', 31)
m.has('name')  // true
m.delete('age')

m.forEach((value, key) => {
    log(key, value)
})
```

---

## Set Type

Collection of unique values:

### Creating Sets
```js
s = Set('a', 'b', 'c', 'a')  // Duplicate 'a' is ignored
emptySet = Set()
```

### Set Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `add(value)` | Adds value to set | void |
| `delete(value)` | Removes value from set | void |
| `has(value)` | Checks if value exists | Boolean |
| `forEach(callback)` | Iterates all values | void |

### Examples
```js
s = Set('a', 'b', 'c')
s.add('d')
s.has('a')  // true
s.delete('b')

s.forEach((value) => {
    log(value)
})
```

---

## Function Declaration

### Named Functions (func keyword)
```js
func minValues(a, b) {
    if (a < b) {
        a
    } else {
        b
    }
}
log(minValues(4, 1))  // 1
```

### Arrow Functions
```js
myFunc = () => {
    log('This is my function')
}

myMin = (a, b) => {
    if (a < b) {
        a
    } else {
        b
    }
}
log(myMin(4, 1))  // 1
```

### Functions as Return Values
```js
myMin = (a) => {
    (b) => {
        if (a < b) {a} else {b}
    }
}
log(myMin(4)(3))  // 3
```

### Function Invocation
```js
result = myFunc(arg1, arg2)
```

---

## Local Variables

Use `let` keyword to create variables with function/loop/if scope:

```js
name = 'John'

func someFunc() {
    let name  // Declares local variable
    name = 'Sara'
    log(name)  // 'Sara'
}

someFunc()
log(name)  // 'John' - outer variable unchanged
```

Shorthand declaration and assignment:
```js
func someFunc() {
    let name = 'Sara'
    // ...
}
```

---

## Structs

Custom complex object types:

### Defining Structs
```js
struct TreeNode {
    id: ''
    value: null
    parent: null
    childNodes: List()

    addNode(node) {
        this.childNodes.add(node)
        node.parent = this
    }
}
```

Simple field declarations (no defaults):
```js
struct Point {x, y}
```

### Creating Struct Instances
```js
root = TreeNode('root')
child1 = TreeNode('child 1', 'custom value')
root.addNode(child1)

p1 = Point(0, 1)
p2 = Point(-3, 2)
```

### Struct Features
- Fields are initialized with default values if not provided
- Methods can access struct instance via `this` keyword
- Constructor accepts arguments in order of field declarations

---

## Built-in Functions

### Math Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `abs(x)` | Absolute value | Number |
| `min(a, b, ...)` | Minimum value | Number |
| `max(a, b, ...)` | Maximum value | Number |
| `pow(x, y)` | x raised to power y | Number |
| `sqrt(x)` | Square root | Number |
| `cos(x)` | Cosine (radians) | Number |
| `sin(x)` | Sine (radians) | Number |
| `tan(x)` | Tangent (radians) | Number |
| `acos(x)` | Arc cosine | Number |
| `asin(x)` | Arc sine | Number |
| `atan(x)` | Arc tangent | Number |
| `logn(x)` | Natural logarithm (base e) | Number |
| `log10(x)` | Base 10 logarithm | Number |
| `log2(x)` | Base 2 logarithm | Number |
| `log(x, ...)` | Console log (debugging) | void |
| `round(x)` | Round to nearest integer | Number |
| `ceil(x)` | Round up | Number |
| `floor(x)` | Round down | Number |
| `PI()` | PI constant | Number |
| `rnd()` | Random float [0, 1) | Number |

### Examples
```js
y = abs(-5)  // 5
x = pow(3, 2)  // 9
angle = PI() / 4  // 45 degrees in radians
random = rnd() * 10  // Random 0-10
value = round(3.78)  // 4
```

### String & Text Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `rgba(r, g, b, a)` | RGBA color string | String |
| `parseInt(text)` | Parse integer | Number |
| `parseFloat(text)` | Parse float | Number |
| `matchesRegex(text, pattern)` | Regex match | Boolean |
| `splitString(str, separator)` | Split string | List |

### Color Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `Color(r, g, b, a)` | Create color object | Color |
| `decodeColor(text)` | Decode color from string | Color |

**Color Object Methods:**
- `encode()`: Encodes color to string
- `gradient(anotherColor, t)`: Mix with another color (t = 0-1)

### Examples
```js
color = Color(255, 145, 140, 1.0)
encoded = color.encode()  // "rgba(255,145,140,1)"
color2 = Color(100, 0, 10, 1.0)
color3 = color.gradient(color2, 0.7)

color = decodeColor("rgba(255,240,200,1.0)")
log(color.r, color.g, color.b, color.a)
```

### Utility Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `uid()` | Unique ID string | String |
| `ifcond(condition, a, b)` | Conditional expression | Any |
| `getEventName()` | Current event name | String |
| `getEventArg(i)` | Event argument at index | Any |

### Examples
```js
id = uid()
result = ifcond(x > 10, -1, 1)  // -1 if x > 10, else 1

eventName = getEventName()
arg0 = getEventArg(0)
```

### Type Conversion

| Function | Description | Returns |
|----------|-------------|---------|
| `toJSON(obj)` | Convert to JSON | Object |
| `fromJSON(obj)` | Convert from JSON | Any |
| `encodeJSON(obj)` | JSON string | String |
| `parseJSON(text)` | Parse JSON string | Any |

---

## Item Functions

Functions available in the context of diagram items. These functions operate on the current item unless specified otherwise.

### Identification

| Function | Description | Returns |
|----------|-------------|---------|
| `getId()` | Item internal ID | String |
| `getName()` | Item name | String |
| `getShape()` | Shape ID | String |
| `getTags()` | Item tags | List |

### Position & Transformation

| Function | Description | Returns |
|----------|-------------|---------|
| `getPosX()` | X position (local) | Number |
| `getPosY()` | Y position (local) | Number |
| `getPos()` | Position as Vector (local) | Vector |
| `getWorldPos()` | Position as Vector (world) | Vector |
| `setWorldPos(x, y)` | Set world position | void |
| `setPosX(x)` | Set X position (local) | void |
| `setPosY(y)` | Set Y position (local) | void |
| `setPos(x, y)` | Set position (local) | void |
| `setPos(Vector)` | Set position using Vector | void |
| `getWidth()` | Item width | Number |
| `getHeight()` | Item height | Number |
| `getAngle()` | Rotation angle (degrees) | Number |
| `setAngle(angle)` | Set rotation angle | void |
| `getScaleX()` | X scale | Number |
| `getScaleY()` | Y scale | Number |
| `setScaleX(x)` | Set X scale | void |
| `setScaleY(y)` | Set Y scale | void |
| `getOpacity()` | Opacity (0-100) | Number |
| `getSelfOpacity()` | Self opacity (0-100) | Number |
| `setOpacity(opacity)` | Set opacity | void |
| `setSelfOpacity(opacity)` | Set self opacity | void |

### Coordinate Conversion

| Function | Description | Returns |
|----------|-------------|---------|
| `worldPoint(x, y)` | Local to world coordinates | Vector |
| `localPoint(x, y)` | World to local coordinates | Vector |
| `matchWorld(x, y, worldX, worldY)` | Match local point to world point | void |

### Visibility

| Function | Description | Returns |
|----------|-------------|---------|
| `isVisible()` | Check visibility | Boolean |
| `show()` | Show item | void |
| `hide()` | Hide item | void |

### Mounting

| Function | Description | Returns |
|----------|-------------|---------|
| `mountTo(otherItem)` | Mount to another item | void |
| `mountChild(otherItem)` | Mount item to self | void |
| `mountRoot()` | Mount to root | void |

### Text Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `setText(textSlotName, text)` | Set text for slot | void |
| `setTextColor(textSlotName, color)` | Set text color | void |
| `setTextSize(textSlotName, size)` | Set text font size | void |

### Custom Variables

| Function | Description | Returns |
|----------|-------------|---------|
| `setVar(name, value)` | Store custom variable | void |
| `getVar(name, defaultValue)` | Get custom variable | Any |

### Examples
```js
// Store and retrieve custom variables
setVar('srcX', getPosX())
setVar('dstX', -467*(slide - 1))

// Use in another function
setPosX(getVar('srcX') * (1 - t) + getVar('dstX') * t)

// Get with default
srcX = getVar('srcX', 0)
dstX = getVar('dstX')  // No default
```

### Events

| Function | Description | Returns |
|----------|-------------|---------|
| `sendEvent(eventName, ...args)` | Send custom event | void |

### Finding Items

| Function | Description | Returns |
|----------|-------------|---------|
| `findItemByName(name)` | Find item by name | Item |
| `findItemById(id)` | Find item by ID | Item |
| `findChildItemByName(name)` | Find child item by name | Item |
| `findChildItemsByTag(tag)` | Find child items by tag | List |
| `findParent()` | Find parent item | Item |

### Item Manipulation

| Function | Description | Returns |
|----------|-------------|---------|
| `duplicate(name)` | Create copy of item | Item |
| `remove()` | Remove item from scene | void |
| `removeChildItemsByTag(tagName)` | Remove child items by tag | void |
| `tag(tagName)` | Add tag to item | void |

### Examples
```js
// Find and manipulate other items
it = findItemByName('ellipse')
dstX = it.getVar('dstX')
it.setPosX(dstX)
it.setTextSize('body', 30)

// Send custom events
sendEvent('my-custom-move', 'up', 10)

// Handle custom events
d = ifcond(getEventArg(0) == 'up', -1, ifcond(getEventArg(0) == 'down', 1, 0))
speed = getEventArg(1)
setPosY(getPosY() + speed * d)

// Duplicate items
newItem = duplicate('new_name')
newItem.setWorldPos(100, 0)

// Remove items
item = @Rect
item.remove()

// Add tags
rectItem = @Rect
rectItem.tag('new-tag')
```

---

## Connector Functions

Additional functions for connector items:

| Function | Description | Returns |
|----------|-------------|---------|
| `totalPoints()` | Number of points | Number |
| `getPointWorldPos(index)` | Position of point | Vector |
| `setPointWorldPos(idx, x, y)` | Set point position | void |
| `addWorldPoint(x, y)` | Add new point | Number (index) |
| `removePoint(pointIdx)` | Remove point | void |
| `getLength()` | Total path length | Number |
| `getWorldPosAtLength(length)` | Position at length | Vector |

### Examples
```js
connector = findItemByName('Connector 1')
n = connector.totalPoints()
p = connector.getPointWorldPos(1)
connector.setPointWorldPos(1, 45, -4)
pointIdx = connector.addWorldPoint(6, 1)
connector.removePoint(2)
length = connector.getLength()
p = connector.getWorldPosAtLength(56)
```

---

## Path Functions

Functions for path items (similar to connectors but with multiple sub-paths):

| Function | Description | Returns |
|----------|-------------|---------|
| `totalPaths()` | Number of paths | Number |
| `totalPathPoints(pathIndex)` | Number of points in path | Number |
| `isPathClosed(pathIdx)` | Check if path is closed | Boolean |
| `closePath(pathIdx)` | Close path | void |
| `openPath(pathIdx)` | Open path | void |
| `getPathPointWorldPos(pathIdx, pointIdx)` | Point position | Vector |
| `setPathPointWorldPos(pathIdx, pointIdx, x, y)` | Set point position | void |
| `addPath()` | Add new path | Number (index) |
| `addPoint(pathIdx, x, y)` | Add point to path | void |
| `addBezierPoint(pathIdx, x, y, x1, y1, x2, y2)` | Add Bezier point | void |
| `getPathLength(pathIdx)` | Length of path | Number |
| `getPathWorldPosAtLength(pathIdx, length)` | Position at length | Vector |

### Examples
```js
pathItem = findItemByName('Path 1')
n = pathItem.totalPaths()
pointsNum = pathItem.totalPathPoints(0)
pathItem.closePath(0)
p = pathItem.getPathPointWorldPos(0, 4)
pathItem.setPathPointWorldPos(0, 4, 100, -54)
pathIdx = pathItem.addPath()
pathItem.addPoint(0, 5, 8)
pathItem.addBezierPoint(0, 5, 8, 2, 3, -1, -3)
```

---

## Table Functions

Functions for table items:

| Function | Description | Returns |
|----------|-------------|---------|
| `setCellText(row, column, text)` | Set cell text | void |
| `getCellText(row, column)` | Get cell text | String |

---

## Math Block Functions

Functions for math block items:

| Function | Description | Returns |
|----------|-------------|---------|
| `setExpression(expression)` | Set TeX expression | void |

**Note:** Escape backslashes in TeX expressions:
```js
mathBlock = findItemByName('Math 1')
mathBlock.setExpression('c = \\pm\\sqrt{a^{23} + b^{-12}}')
```

---

## Value Functions

Functions available for modifying the "value" of the item, typically used by "textfield" shapes but could be used on any item.

| Function | Description | Returns |
|----------|-------------|---------|
| `getValue()` | Get value | String |
| `setValue(value)` | Set value | void |

---

## Reserved Keywords

| Keyword | Purpose |
|---------|---------|
| `if` | Conditional statement |
| `else` | Else clause |
| `while` | While loop |
| `for` | For loop |
| `true` | Boolean true |
| `false` | Boolean false |
| `null` | Null value |
| `struct` | Struct definition |
| `func` | Function declaration |
| `local` | Local variable (alias for let) |
| `let` | Local variable |
| `return` | Return from function |
| `enc` | Encode expression |

---

## Operator Precedence

From highest to lowest:

1. `^` (power)
2. `/`, `*`, `%`
3. `-`, `+` (binary)
4. `<<`, `>>`
5. `&`
6. `|`
7. `<`, `>`, `<=`, `>=`
8. `!=`, `==`
9. `&&`
10. `||`
11. `++`, `--`
12. `-=`, `+=`, `*=`
13. `=`

---

## Implementation Details

### Entry Point
- **File:** `src/ui/templater/ast.js`
- **Function:** `parseExpression(expression)`
- **Returns:** ASTNode

### Tokenization
- **File:** `src/ui/templater/tokenizer.js`
- **Function:** `tokenizeExpression(text)`
- Token types: TERM, NUMBER, STRING, STRING_TEMPLATE, OPERATOR, RESERVED, etc.

### AST Node Types
- **ASTNode**: Base class for all AST nodes
- **ASTValue**: Literal values (numbers, booleans, null)
- **ASTVarRef**: Variable reference
- **ASTAssign**: Assignment operation
- **ASTMultiExpression**: Multiple expressions (last is return value)
- **ASTIFStatement**: If statement
- **ASTWhileStatement**: While loop
- **ASTForLoop**: For loop
- **ASTFunctionDeclaration**: Function definition
- **ASTFunctionInvocation**: Function call
- **ASTExternalObjectLookup**: Item reference (@)
- **ASTStringTemplate**: Templated string
- **ASTStructNode**: Struct definition
- **ASTLocalVariable**: Local variable declaration

### Execution Context
- **Scope**: Manages variable bindings and scope chains
- **File:** `src/ui/templater/scope.js`
- Supports nested scopes with parent references
- Provides external object lookup for `@` references

### Built-in Types Implementation
- **Vector:** `src/ui/templater/vector.js`
- **List:** `src/ui/templater/list.js`
- **Color:** `src/ui/templater/color.js`
- **Map/Set:** JavaScript built-ins wrapped in reservedFunctions

---

## Common Patterns

### Animation
```js
// Linear interpolation
t = getEventArg(0)  // Assume t is 0-1
srcX = getVar('srcX', getPosX())
dstX = getVar('dstX', 100)
setPosX(srcX * (1 - t) + dstX * t)
```

### Conditional Formatting
```js
if (getValue() > 100) {
    setTextColor('body', 'rgba(255,0,0,1)')
} else {
    setTextColor('body', 'rgba(0,255,0,1)')
}
```

### Looping Through Items
```js
for (i = 1; i <= 10; i++) {
    item = findChildItemByName(`item-${i}`)
    if (item) {
        item.setPosX(i * 50)
    }
}
```

### Using Vectors
```js
pos = getWorldPos()
targetPos = @Target.getWorldPos()
direction = (targetPos - pos).normalized()
distance = pos.distance(targetPos)  // Note: Not built-in, would need custom implementation
```

### Struct with Methods
```js
struct Circle {
    x: 0
    y: 0
    radius: 10

    area() {
        PI() * this.radius * this.radius
    }

    circumference() {
        2 * PI() * this.radius
    }
}

c = Circle(5, 5, 20)
log(c.area())
```

---

## Limitations

1. No native arrays (use List instead)
2. No classes (use structs for similar functionality)
3. No `this` keyword outside of struct methods
4. No `new` operator (constructors are just functions)
5. Limited error messages in some cases
6. No `switch` statements (use if-else chains)
7. No `break` or `continue` in loops
8. No `try-catch` error handling
9. No `delete` operator for object properties
10. No computed property names

---

## Debugging

### Logging
```js
log('Value:', x, 'Another:', y)
```

### Item Debugging
```js
debugItem()  // Prints item information to console
```

### Error Handling
The language has limited error handling. Use conditional checks to avoid errors:
```js
if (item) {
    item.setPosX(100)
}
```

---

## Quick Reference Card

```
┌───────────────────────────────────────────────────────────────┐
│                  SCHEMIO SCRIPT QUICK REFERENCE               │
├───────────────────────────────────────────────────────────────┤
│ VARIABLES: name = value           LOCAL: let name = value     │
│ IF: if (cond) { ... } else { ... }                            │
│ LOOPS: while (cond) { ... }    for (init; cond; step) { ... } │
│ FUNCTIONS: func f(a,b) { ... }    (a,b) => { ... }            │
│ ITEMS: @ItemName    @"Item 2"    @`Item ${i}`                 │
│ VECTOR: Vector(x,y)  v.length()  v.normalized()               │
│ LIST: List(a,b,c)   list.map()   list.filter()                │
│ MAP: Map(k1,v1,k2,v2)  map.get(k)  map.set(k,v)               │
│ SET: Set(a,b,c)  set.has(a)  set.add(b)                       │
│ STRUCT: struct Name { field: default, method() { ... } }      │
│ MATH: abs()  min()  max()  pow()  sqrt()  PI()  rnd()         │
│ COLOR: Color(r,g,b,a)  decodeColor(s)  color.gradient(c,t)    │
│ ITEM: getPosX()  setPos(x,y)  getWidth()  setText(slot, text) │
│ EVENT: sendEvent(name, args)  getEventName()  getEventArg(i)  │
└───────────────────────────────────────────────────────────────┘
```
