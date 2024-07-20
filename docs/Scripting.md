SchemioScript Language
===========================

Schemio offers a possibility of simple scripting. At this moment the Schemio scripting language is still in development and is very limited in features. Yet you still can achieve complex items behavior in your diagram.

- [Basic syntax](#basic-syntax)
- [Boolean expressions](#boolean-expressions)
- [Templated strings](#templated-strings)
- [If statements](#if-statements)
- [Loops](#loops)
    - [While](#while)
    - [For loops](#for-loops)
- [Item referencing](#item-referencing)
- [Vector](#vector)
    - [Vector functions](#vector-functions)
      - [length](#length)
      - [normalized](#normalized)
      - [projection](#projection)
      - [rotate](#rotate)
      - [inverse](#inverse)
- [List](#list)
    - [List functions](#list-functions)
      - [add (List)](#add-list)
      - [remove (List)](#remove-list)
      - [get (List)](#get-list)
      - [set (List)](#set-list)
      - [insert (List)](#insert-list)
      - [size (List)](#size-list)
      - [findIndex (List)](#findindex-list)
      - [forEach (List)](#foreach-list)
      - [map (List)](#map-list)
      - [filter (List)](#filter-list)
      - [pop (List)](#pop-list)
      - [shift (List)](#shift-list)
      - [first (List)](#first-list)
      - [last (List)](#last-list)
      - [extendList (List)](#extendlist-list)
- [Map](#map)
    - [Map functions](#map-functions)
      - [get (Map)](#get-map)
      - [set (Map)](#set-map)
      - [has (Map)](#has-map)
      - [delete (Map)](#delete-map)
      - [forEach (Map)](#foreach-map)
- [Set](#set)
    - [Set functions](#set-functions)
      - [add (Set)](#add-set)
      - [delete (Set)](#delete-set)
      - [has (Set)](#has-set)
      - [forEach (Set)](#foreach-set)
- [Function declaration](#function-declaration)
- [Local variables](#local-variables)
- [Structs](#structs)
- [Functions](#functions)
    - [abs](#abs)
    - [min](#min)
    - [pow](#pow)
    - [sqrt](#sqrt)
    - [cos](#cos)
    - [sin](#sin)
    - [acos](#acos)
    - [asin](#asin)
    - [uid](#uid)
    - [log](#log)
    - [round](#round)
    - [ceil](#ceil)
    - [floor](#floor)
    - [PI](#pi)
    - [rnd](#rnd)
    - [rgba](#rgba)
    - [ifcond](#ifcond)
    - [getEventName](#geteventname)
    - [getEventArg](#geteventarg)
    - [Item functions](#item-functions)
      - [debugItem](#debugitem)
      - [getId](#getid)
      - [setVar](#setvar)
      - [getVar](#getvar)
      - [getPosX](#getposx)
      - [getPosY](#getposy)
      - [getPos](#getpos)
      - [getWorldPos](#getworldpos)
      - [setWorldPos](#setworldpos)
      - [worldPoint](#worldpoint)
      - [localPoint](#localpoint)
      - [getWidth](#getwidth)
      - [getHeight](#getheight)
      - [getAngle](#getangle)
      - [getScaleX](#getscalex)
      - [getScaleY](#getscaley)
      - [getOpacity](#getopacity)
      - [getSelfOpacity](#getselfopacity)
      - [matchWorld](#matchworld)
      - [mount](#mount)
      - [mountRoot](#mountroot)
      - [setPosX](#setposx)
      - [setPosY](#setposy)
      - [setPos](#setpos)
      - [setWidth](#setwidth)
      - [setHeight](#setheight)
      - [setScaleX](#setscalex)
      - [setScaleY](#setscaley)
      - [setOpacity](#setopacity)
      - [setSelfOpacity](#setselfopacity)
      - [isVisible](#isvisible)
      - [show](#show)
      - [hide](#hide)
      - [setText](#settext)
      - [setTextColor](#settextcolor)
      - [setTextSize](#settextsize)
      - [sendEvent](#sendevent)
      - [findItemByName](#finditembyname)
      - [findItemById](#finditembyid)
      - [findChildItemByName](#findchilditembyname)
      - [findChildItemsByTag](#findchilditemsbytag)
      - [findParent](#findparent)
      - [getValue](#getvalue)
      - [setValue](#setvalue)
      - [duplicate](#duplicate)
    - [Connector functions](#connector-functions)
      - [totalPoints (connector)](#totalpoints-connector)
      - [getPointWorldPos (connector)](#getpointworldpos-connector)
      - [setPointWorldPos (connector)](#setpointworldpos-connector)
      - [addWorldPoint (connector)](#addworldpoint-connector)
      - [removePoint (connector)](#removepoint-connector)
    - [Path functions](#path-functions)
      - [totalPaths (path)](#totalpaths-path)
      - [totalPathPoints (path)](#totalpathpoints-path)
      - [isPathClosed (path)](#ispathclosed-path)
      - [closePath (path)](#closepath-path)
      - [openPath (path)](#openpath-path)
      - [getPathPointWorldPos (path)](#getpathpointworldpos-path)
      - [setPathPointWorldPos (path)](#setpathpointworldpos-path)
      - [addPath](#addpath)
      - [addPoint (path)](#addpoint-path)
      - [addBeizerPoint (path)](#addbeizerpoint-path)
    - [Math block functions](#math-block-functions)
      - [setExpression](#setexpression)


Basic syntax
--------------

The schemio syntax is close to Javascript. However it does not have `const`, `let` or `var` keywords for variable declaration. To declare a new variable all you have to do is specify its name and use `=` operator:

Example:
```js
name = "John"
age = 19
```

Multiple statements can be separated by either `;` symbol or new line. For any expression, only the last statement is considered a return value. The code below is valid and will return `30`

```js
x = (a = 1; b = 2; a + b); x*10
```


You can also split any expression over multiple lines and it will still work. For instance the below script will output `x 26`

```js
x = 4 +
5 * 4 + y
% 3

log('x', x)
```


Boolean expressions
-------------------

Boolean expressions are implemented the same way as in C. You may use the following operators

- `==`: Equality operator e.g. `x == y + 5`
- `!=`: Inequality operator e.g. `x != y + 5`
- `>`, `<`, `>=`, `<=`: comparison operators e.g. `x > (y + 2)*6` or `x <= 23`
- `&&`: AND operator e.g. `x > (y + 2)*6 && x <= 23`
- `||`: OR operator e.g. `x > (y + 2)*6 || x <= 23`
- `!`: NOT operator e.g. `!(x > 10 && x < 20)`


Templated strings
-----------------

Regular strings can be specified using single or double quotes (`'` or `"`). But if you use backticks you can use expressions inside of a string using `${ ... }` syntax

Example:
```js
setTextColor('body', `rgba(${r + 10}, ${g}, 20, 0.5)`)
```


If statements
--------------

It is possible to use if statements in SchemioScript language the same way as in JavaScript. You can use `if` and `else` keywords and you can construct complex expressions:

```js
x = 5
y = 3
result = 1
if (z == 0) {
    result = x + y
} else if (z == 1) {
    result = x * y
} else if (z == 2) {
    result = x - y
} else {
    result = x + y * 2
}
```

Unlike JavaScript if statements in SchemioScript language can also be used as terms and you can assign them to other variables. It takes the last executed statement in the if block as the result of the expression.

```js
x = getPosX();
x = if (x < 100) {
    step = 4
    x + step
} else { 0 }
```


Loops
--------------

#### While

SchemioScript supports `while` type loops like in the example below:

```js
i = 0
sum = 0
while (i < 10) {
    sum += i
    i += 1
}
```

#### For loops

It is also possible to use C-like for loops:

```js
for (i = 0; i < 5; i++) {
    log(i)
}
```


Item referencing
-----------------

If you want to use other items in your script, you can do it via `@` symbol. For example, if you have an item named "Rect", you can reference it using `@Rect`

```
pos = @Rect.getWorldPos()
@Rect.setWorldPos(pos.x + 20, pos.y - 10)
```


If you use non alphanumeric symbols, then you can surround the item's name with quotes (`"` or `'`):

```
pos = @"Rect 2".getWorldPos()
@"Rect 2".setWorldPos(pos.x + 20, pos.y - 10)
```


Also you can use templated strings to make use of dynamic item referencing. Imagine you have multiple similar shapes and you want to apply the same transformation to them. You can do it in a "for" loop:

```
for (i = 1; i < 10; i++) {
    pos = @`Rect ${i}`.getWorldPos()
    @`Rect ${i}`.setWorldPos(pos.x + 20, pos.y - 10)
}
```


Vector
------------

SchemioScript introduces a 2D Vector structure that makes it easier to handle vector math. You may use `+`, `-`, `*` and `/` operators on vectors, SchemioScript also handles scalar and vector mixed operations such as scalar multiplied by vector or vector divided by scalar.

```js
v1 = Vector(3, 4)
v2 = Vector(1, -2)

dx = v1.x - v2.x

dv = v1 - v2

v3 = v1 + 10 * v2

length = v3.length()

normal = v3.normalized()
```

`Vector` struct has two properties `x` and `y`. To create a new vector and assign it to a variable just use `v = Vector(0, 0)`.


#### Vector functions

##### length

`length()` returns the length of the current vector

Example
```js
v = Vector(3, 5)
d = v.length()
```

##### normalized

`normalized()` returns a new vector which has the same direction as the currect vector but its length is equal to 1

```js
v = Vector(10, -2)
normal = v.normalized()
```

##### projection

`projection(v)` returns a scalar value of projection of one vector to another vector.
For example, if we want to project vection v1 to vector v2:

```js
v1 = Vector(1, 3)
v2 = vector(4, 1)

p = v1.projection(v2)
```


##### rotate

`rotate(angle)` returns a vector that is rotated by `angle` radians.

```js
v = Vector(2, 7)

// Rotating vector by 90 degrees
v2 = v.rotate(PI() / 2)
```


##### inverse

`inverse()` returns an inversed vector

```js

v = Vector(2, 7)
v = v2.inverse()
```

List
--------------------

At this moment SchemioScript does not support native arrays, but you can make use of `List` object.

```js
items = List(4, 5, 2)
items.add(10)
```

#### List functions

##### add (List)

`add(item)` function lets you add a single item to the list:

```js
items = List(4, 5, 2)
items.add(10)
items.add(4)
```

##### remove (List)

`remove(index)` function deletes a single item in the specified position in the list:

```js
items = List(4, 5, 2)
items.remove(1)
```


##### get (List)

`get(index)` function returns a single item in the specified position in the list:

```js
items = List('a', 'c', 'd')
item1 = items.get(1)
item2 = items.get(2)
```


##### set (List)

`set(index, value)` function updates the value at specified position in the list:

```js
items = List('a', 'c', 'd')
items.set(1, 'b')
items.set(2, 'c')
```

##### insert (List)

`insert(index, value)` function inserts value at specified position in the list:

```js
items = List('a', 'c', 'd')
items.insert(1, 'b')
```

##### size (List)

`size` property contains the number of items in the list:

```js
items = List('a', 'b', 'c')
for (i = 0; i < items.size; i++) {
    log(items.get(i))
}
```

##### findIndex (List)

`findIndex(callback)` function finds the index of the first element that satisfies the provided testing function. It returns `-1` if no element could be found.

```js
items = List('a', 'b', 'c')
idx = items.findIndex((item) => { item == 'b' })
```

##### forEach (List)

`forEach(callback)` function iterates the list and calls specified `callback` function with each item value and its position in the List:

```js
items = List('a', 'b', 'c')
items.forEach((item, index) => {
    log(index, item)
})
```

##### map (List)

`map(callback)` function returns a new `List` object which is populated with the results of calling `callback` function to each item

```js
items = List(1, 2, 3)
newItems = items.map((value, index) => {
    value * 100
});
```

##### filter (List)

`filter(predicate)` function returns a new `List` object which contains the filtered items from original list, which have returned true upon calling the `predicate` function on every item.

```js
items = List(1, 20, 5, 10)
newItems = items.map((value, index) => { value < 7 });
```


##### pop (List)

`pop()` function returns the last element from the list and removes it from the list:

```js
items = List('a', 'c', 'd')
last = items.pop()
```

##### shift (List)

`shift()` function returns the first element from the list and removes it from the list:

```js
items = List('a', 'c', 'd')
last = items.shift()
```

##### first (List)

`first()` function returns the first element from the list

##### last (List)

`last()` function returns the first element from the list

##### extendList (List)

`extendList(anotherList)` function appends all items from `anotherList` argument to original `List` object

```js
items = List(1, 2, 3)
items.extendList(List(3, 5, 6))
```

Map
--------------------

In SchemioScript you can make use of [hash tables](https://en.wikipedia.org/wiki/Hash_table) with `Map(key1, value1, key2, value2, ....)` constructor.
It takes an array in which every odd argument is a name, and even argument is the value of the record with that name. E.g.:

```js
m = Map('name', 'John', 'age', 30)
log('Name is:', m.get('name'))
log('Age is:', m.get('age'))
```

#### Map functions

##### get (Map)

`get(key)` function returns the value associated with the `key` name


##### set (Map)

`set(key, value)` updates the value associated with the `key` name

```js
m = Map('name', 'John', 'age', 30)
log('Name is:', m.get('name'))
log('Age is:', m.get('age'))
```

##### has (Map)

`has(key)` function return `true` if there is a record associated with specified `key` name

##### delete (Map)

`delete(key)` functions deletes a record associated with specified `key`

##### forEach (Map)

`forEach(callback)` iterates over every record in a Map and calls specified `callback` function with value and the key:

```js
m = Map('name', 'John', 'age', 30)
m.forEach((value, key) => {
    log(key, value)
})
```


Set
----------------

`Set` constructor creates a "hash set", which is a collecion of non-duplicate values

```js
s = Set('a', 'b', 'c', 'a')
s.forEach((value) => {
    log(value)
})
```

#### Set functions

##### add (Set)

`add(value)` functions add a new item to the set. If such item is already present in the set, then it is ingored


##### delete (Set)

`delete(value)` removes the value from the set.

##### has (Set)

`has(value)` returns `true` if the specified value is in the set, otherwise - `false`

##### forEach (Set)

`forEach(callback)` iterates over all items in the Set and call `callback` function the the item


```js
s = Set('a', 'b', 'c', 'a')
s.forEach((value) => {
    log(value)
})
```



Function declaration
--------------------

You can declare a function using `func` keyword like this:

```js
func minValues(a, b) {
    if (a < b) {
        a
    } else {
        b
    }
}
log(myMin(4, 1))
```

Alternatively you can declare your own functions using arrow function syntax: `(arg1, arg2) => {/* This is the function body */}`.

```js
myFunc = () => {
    log('This is my function')
}
```

Specifying function arguments:

```js
myMin = (a, b) => {
    if (a < b) {
        a
    } else {
        b
    }
}
log(myMin(4, 1))
```


Using function as a return statement:

```js
myMin = (a) => {
    (b) => {
        if (a < b) {a} else {b}
    }
}
log(myMin(4)(3))
```


Local variables
----------------
You may want to isolate your local variables to the scope of your function, loop or if statement. For such cases you should use `local` keyword:

```
name = 'John'

func someFunc() {
    local name
    name = 'Sara'
    log(someVar)
}

someFunc()
log(someVar)
```

The example above should first output 'Sara' and then 'John', because the `name` variable in `someFunc` function is redefined as local.

You can also assign a value to a local variable on the same line with `local` keyword:

```
func someFunc() {
    local name = 'Sara'
    // ...
}
```


Structs
-------------
To create custom complex objects in SchemioScript you can make use of `struct`.
Structs let you declare fields and functions.
You can reference struct object using `this` keyword inside of a struct function.

```
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

When you declare a custom struct type, it creates a function with the name of the struct, which is used to initialize a struct object.
Based on the example above we can create a `TreeNode` object like this:

```
root = TreeNode('root')
child1 = TreeNode('child 1', 'custom value')
root.addNode(child1)
```

As you can see from example above - you don't have to specify all struct arguments when initiating a struct object. If some arguments are missed, then the struct is initiated with the default values specified in the `struct` itself.

If you don't want to specify default values in the `struct` you can just declare the names of the fields separated by comma:

```
struct Point {x, y}

p1 = Point(0, 1)
p2 = Point(-3, 2)
```


Functions
-------------

#### abs

`abs(x)` takes only a single argument and returns absolute value for that argument.

Example:
```js
y = 1;
x = abs(y);
```

#### min

`min(a, b, c, ...)` takes any number of arguments and returns the smallest one.

Example:
```js
y = 1;
z = 2
x = min(0, y, z);
```

#### pow

`pow(x, y)` returns the value of a base expression (`x`) taken to a specified power (`y`)

Example that raises 3 to the power of 2:
```js
pow(3, 2)
```

#### sqrt

`sqrt(x)` returns the square root for specified value

Example (will return `5`)
```js
sqrt(25)
```

#### cos

`cos(x)` returns cosine of specified value

```js
cos(0.4)
```

#### sin

`sin(x)` returns sine of specified value

```js
sin(0.4)
```

#### acos

`acos(x)` returns arc cosine or inverse of cosine

```js
acos(0.9)
```

#### asin

`asin(x)` returns arc sine or inverse of sine

```js
asin(0.9)
```


#### uid

`uid()` returns a short unique random generated string

```
id = uid()
```


#### log

`log(a, b, c, ...)` print all of its arguments to console in developer tools. Useful for debugging.

```js
x = 4;
y = 2;
log('info:', 'x =', x, 'y =', y)
```


#### round

`round(x)` rounds the specified number to the nearest integer value

```js
x = 3.78;
result = round(x)
```

#### ceil

`ceil(x)` rounds the specified number to the closest larger integer


```js
x = 3.78;
result = ceil(x)
```

#### floor

`floor(x)` rounds the specified number to the closest smaller integer


```js
x = 3.78;
result = floor(x)
```

#### PI

`PI()` returns just the PI value which is `3.141592653589793`

Example:
```js
x = R * cos (angle * PI() / 180)
```

#### rnd

`rnd()` returns random floating point number from 0 to 1

Example:
```js
x = rnd() * 10
```


#### rgba

`rgba(r, g, b, a)` converts `r`, `g`, `b`, `a` values of color into string.


#### ifcond

`ifcond(s, a, b)` takes 3 arguments and returns either 2nd or 3rd argument depending on the 1st one (e.g. `a` in case `s == true`, otherwise `b`). It can be used as a conditional expression.

Example:

```js
x = 1;
result = ifcond(x + y > 2, -1, 1);
```

The code above will return `-1` in case if `y` value is `0` and will return `1` if the expression is becomes valid (e.g. when `y` is set to 10).


#### getEventName

`getEventName()` returns the name of the event for which the current script is running


#### getEventArg

`getEventArg(i)` returns the event argument value at position `i` which is the number of argument starting from 0. It only makes sense to use this function if the event was sent using [sendEvent](#sendevent) function with custom arguments.


#### Item functions

Since all the script and condition functions are executed on some particular item, you get access to that items data.


##### debugItem

`debugItem()` prints various information to script console about the item including its position, size, shape and all supported functions


##### getId

`getId()` returns item internal id


##### setVar

`setVar(name, value)` stores user defined variable in the context of an item. This is useful in case you need to have access to the same variable from different script function. For instance you can prepare some variables in on script function:

```js
setVar('srcX', getPosX())
setVar('dstX', -467*(slide - 1))
```

And in another function you can have an animation that changes position of an item:

```js
setPosX(getVar('srcX') * (1 - t) + getVar('dstX') * t)
```

##### getVar

`getVar(name, defaultValue)` - retreives custom user variables from current item context. If such variable was not defined it returns `defaultValue` argument

Example:
```js
srcX = getVar('srcX', 0)
dstX = getVar('dstX')
```


##### getPosX

`getPosX()` returns the `x` value of current item position in its local transform


##### getPosY

`getPosX()` returns the `y` value of current item position in its local transform


##### getPos

`getPos()` returns [Vector](#vector) that represents the item's position in its local coordinates


##### getWorldPos

`getWorldPos()` returns [Vector](#vector) that represents the position of item's pivot point in world coordinates


##### setWorldPos

`setWorldPos(x, y)` sets the position of item such that its pivot point matches the specified `x` and `y` in world coordinates


##### worldPoint

`worldPoint(x, y)` converts the specified point from local coordinates of the item to the world coordinates and returns it as [Vector](#vector).


##### localPoint

`localPoint(x, y)` converts the specified point from world coordinates of the item to the local coordinates and returns it as [Vector](#vector).


##### getWidth

`getWidth()` returns the width of current item


##### getHeight

`getHeight()` returns the height of current item


##### getAngle

`getAngle()` returns the rotation angle in degrees


##### getScaleX

`getScaleX()` returns the scale on the X axis (default is `1`)


##### getScaleY

`getScaleY()` returns the scale on the Y axis (default is `1`)


##### getOpacity

`getOpacity()` returns the opacity (percent of visibility) value of the item (from 0 to 100)


##### getSelfOpacity

`getSelfOpacity()` returns the self opacity (percent of visibility without effecting attached child items) value of the item (from 0 to 100)


##### matchWorld

`matchWorld(x, y, worldX, worldY)` moves it such that its local point at `(x, y)` matches world point at `(worldX, worldY)`


##### mount

`mount(otherItem)` mounts item to another item


##### mountRoot

`mountRoot()` mounts current item to root.


##### setPosX

`setPosX(x)` sets the items position in X axis in its local coordinates

##### setPosY

`setPosY(y)` sets the items position in Y axis in its local coordinates


##### setPos

`setPos(x, y)` sets the position of item to the specified `x` and `y` in local coordinates.

```js
setPos(4, 5)
```

`setPos` function can also be called using a single `Vector` argument

```js
v = Vector(3, 5)
setPos(v)
```


##### setWidth

`setWidth(width)` changes items width


##### setHeight

`setHeight(height)` changes items height


##### setScaleX

`setScaleX(x)` changes items scale on X axis


##### setScaleY

`setScaleY(Y)` changes items scale on Y axis


##### setOpacity

`setOpacity(opacity)` changes items opacity (percentage of visibility including attached child items). Valid values are from 0 to 100.


##### setSelfOpacity

`setSelfOpacity(opacity)` changes items self opacity (percentage of visibility without effecting attached child items). Valid values are from 0 to 100.


##### isVisible

`isVisible()` checkes whether the items is rendered


##### show

`show()` enables rendering of the items and all of its attached child items


##### hide

`hide()` disabled rendering of the items and all of its attached child items


##### setText

`setText(testSlotName, text)` changes the text for the specified text slot (`textSlotName`). Various shapes might have different text slots

where `textSlotName` is the name of the text slot.

Example:

```js
setText('body', 'Hello!')
```


##### setTextColor

`setTextColor(textSlotName, color)` changes text color for the specified text slot (`textSlotName`). `color` argument is a string and should be in `rgba(10, 10, 10, 1.0)` format. You can use it in combination with [rgba](#rgba) function.

Example:
```js
r = 100
g = 100
b = 50
setTextColor("body", rgba(r, g, b, 1.0))
```


##### setTextSize

`setTextSize(textSlotName, size)` changes text font size for the specified text slot (`textSlotName`).



##### sendEvent

`sendEvent(eventName, ...args)` sends arbitrary event with argument to current item. This way you can have more flexibility in the event handler of your item by parameterizing it.

Example in one item:
```js
sendEvent('my-custom-move', 'up', 10)
```

Another item:
```js
sendEvent('my-custom-move', 'down', 10)
```

Example of a script that is invoked in the custom `my-custom-move` event:
```js
d = ifcond(getEventArg(0) == 'up',
          -1,
          ifcond(getEventArg(0) == 'down', 1, 0))

speed = getEventArg(1)
setPosY(getPosY() + speed * d)
```


##### findItemByName

`findItemByName(name)` searches for first item which name matches the specified `name` argument and returns an [item interface](#item-functions) with all same item functions, but in the context of specified item. Using this function you can change the properties of different items from the same script.

Example:
```js
it = findItemByName('ellipse')

dstX = it.getVar('dstX')
it.setPosX(dstX)
it.setTextSize('body', 30)
```


##### findItemById

`findItemById(id)` same as [findItemByName](#finditembyname) but it searchs for item base on its internal id.


##### findChildItemByName

`findChildItemByName(name)` searches only for child items of the current item and returns the first one which name matches the specified `name` argument. This is used when you want to narrow the scope of items within particular group.


##### findChildItemsByTag

`findChildItemByName(tag)` searches only for child items of the current item and returns the [List](#list) object,
which represents a list of items that contain the specified `tag` in theirs tags. This is used when you need to manipulate multiple items

```js
for (frame = 2; frame < 10; frame++) {
    findChildItemByName(`frame-${frame}`).forEach((item) => {
        item.hide()
    })
}
```


##### findParent

`findParent()` searches for parent item of the current item


##### getValue

`getValue()` function is only available for `textfield` items and returns the value that was typed into the textfield

Example:
```js
textfield = findItemByName('Name textfield')
name = textfield.getValue()
```

##### setValue

`setValue(value)` function is only available for `textfield` items and sets the value in the textfield

Example:
```js
textfield = findItemByName('Name textfield')
textfield.setValue('John')
```


##### duplicate

`duplicate` function creates a copy of the item (for which the `script` function is executed) and places it on scene at the same parent as the original item.
The duplicated item also copies all events a actions from the original item.

Example:
```js
newItem = duplicate()
newItem.setWorldPos(100, 0)
```


#### Connector functions

Connector item has additional functions that let you manipulate its points and shape.

##### totalPoints (connector)

`totalPoints()` function returns the number of points in current connector item. E.g.

```js
connector = findItemByName('Connector 1')
n = connector.totalPoints()
```

##### getPointWorldPos (connector)

`getPointWorldPos(index)` returns the `Vector` object that represents the point at `index` position in the world coordinates

```js
connector = findItemByName('Connector 1')
p = connector.getPointWorldPos(1)
log('x', p.x, 'y', p.y)
```

##### setPointWorldPos (connector)

`setPointWorldPos(idx, x, y)` updates the position of point at specified `index` so that it matches the specified `x` and `y` in world coordinates

```js
connector = findItemByName('Connector 1')
p = connector.setPointWorldPos(1, 45, -4)
```


##### addWorldPoint (connector)

`addWorldPoint(x, y)` adds a new point to connector at specified `x` and `y` in world coordinates and returns the point index.

```js
connector = findItemByName('Connector 1')
connector.addWorldPoint(6, 1)
pointIdx = connector.addWorldPoint(1, 45)
```


##### removePoint (connector)

`removePoint(pointIdx)` removed point at specified `pointIdx` index

```js
connector = findItemByName('Connector 1')
connector.removePoint(2)
```


#### Path functions

Similar to [Connector](#connector-functions) a path item allows you to manipulate its points. The main difference compared to connector is that the path item actually consists of multiple paths.


##### totalPaths (path)

`totalPaths()` returns the number of paths in a path item

```js
pathItem = findItemByName('Path 1')
n = pathItem.totalPaths()
```

##### totalPathPoints (path)

`totalPathPoints(pathIndex)` returns the number of points in specified path. `pathIndex` is the index of a path in a path item.

```js
pathItem = findItemByName('Path 1')
pointsNum = pathItem.totalPathPoints(0)
```

##### isPathClosed (path)

`isPathClosed(pathIdx)` returns `true` if the path with specified `pathIdx` index is closed, `false` otherwise. By closed path it means that the last point and the first point are connected by a straight line.

```js
pathItem = findItemByName('Path 1')
log(pathItem.isPatchClosed(0))
```

##### closePath (path)

`closePath(pathIdx)` closes the path with specified `pathIdx` index.

```js
pathItem = findItemByName('Path 1')
pathItem.closePath()
```

##### openPath (path)

`openPath(pathIdx)` opens the path with specified `pathIdx` index, which means that the first and last point will be disconnected.

```js
pathItem = findItemByName('Path 1')
pathItem.openPath()
```

##### getPathPointWorldPos (path)

`getPathPointWorldPos(pathIdx, pointIdx)` return `Vector` which represent the position in world coordinates of the point with specified `poindIdx` index in specified path.

```js
pathItem = findItemByName('Path 1')
p = pathItem.getPathPointWorldPos(0, 4)
log('x', p.x, 'y', p.y)
```

##### setPathPointWorldPos (path)

`setPathPointWorldPos(pathIdx, pointIdx, x, y)` updates the position of a point with `pointIdx` index in specified path such that it matches the `x` and `y` in woorld coordinates

```js
pathItem = findItemByName('Path 1')
pathItem.setPathPointWorldPos(0, 4, 100, -54)
```


##### addPath

`addPath()` adds a new open path in the `path` shape and returns its index

```js
pathItem = findItemByName('Path 1')
pathIdx = pathItem.addPath()
```


##### addPoint (path)

`addPoint(pathIdx, x, y)` adds a new point with specified `x` and `y` in world coordinates to the path at specified `pathIdx` index

```js
pathItem = findItemByName('Path 1')
pathItem.addPoint(0, 5, 8)
```


##### addBeizerPoint (path)

`addBeizerPoint(pathIdx, x, y, x1, y1, x2, y2)` adds a new beizer point with specified `x` and `y` in world coordinates to the path at specified `pathIdx` index. `x1`, `y1` and `x2`, `y2` are the beizer curve points relative to the `x`, `y` point.

```js
pathItem = findItemByName('Path 1')
pathItem.addBeizerPoint(0, 5, 8, 2, 3, -1, -3)
```


#### Math block functions

##### setExpression

`setExpression(expression)` updates the TeX format based expression in math block.
Keep in mind that since TeX is using `\` for denoting functions, you will need to escape it in the script with additional `\`

```js
mathBlock = findItemByName('Math 1')
mathBlock.setExpression('c = \\pm\\sqrt{a^{23} + b^{-12}}')
```