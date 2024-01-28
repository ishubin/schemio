Schemio Scripting Language
===========================

Schemio offers a possibility of simple scripting. At this moment the Schemio scripting language is still in development and very limited in features. It does not support if statements, for loops, functions etc. Yet you still can achieve complex items behavior in your diagram.

- [Basic syntax](#basic-syntax)
- [Boolean expressions](#boolean-expressions)
- [Templated strings](#templated-strings)
- [If statements](#if-statements)
- [Loops](#loops)
- [Vector](#vector)
    - [Vector functions](#vector-functions)
      - [length](#length)
      - [normalized](#normalized)
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
      - [findParent](#findparent)
      - [getValue](#getvalue)
      - [setValue](#setvalue)


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

It is possible to to use if statements in Schemio scripting language the same way as in JavaScript. You can use `if` and `else` keywords and you can construct complex expressions:

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

Unlike JavaScript if statements in Schemio scripting language can also be used as terms and you can assign them to other variables. It takes the last executed statement in the if block as the result of the expression.

```js
x = getPosX();
x = if (x < 100) {
    step = 4
    x + step
} else { 0 }
```


Loops
--------------

SchemioScript supports `while` type loops like in the example below:

```js
i = 0
sum = 0
while (i < 10) {
    sum += i
    i += 1
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

`setPos(pos)` takes `pos` [Vector](#vector) argument and sets the items position in its local coordinates


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
