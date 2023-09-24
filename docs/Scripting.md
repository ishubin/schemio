Schemio Scripting Language
===========================

Schemio offers a possibility of simple scripting. At this moment the Schemio scripting language is still in development and very limited in features. It does not support if statements, for loops, functions etc. Yet you still can achieve complex items behavior in your diagram.

- [Basic syntax](#basic-syntax)
- [Boolean expressions](#boolean-expressions)
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
    - [ifcond](#ifcond)
    - [Item functions](#item-functions)
      - [setVar](#setvar)
      - [getVar](#getvar)
      - [getPosX](#getposx)
      - [getPosY](#getposy)
      - [getWidth](#getwidth)
      - [getHeight](#getheight)
      - [getAngle](#getangle)
      - [getScaleX](#getscalex)
      - [getScaleY](#getscaley)
      - [getOpacity](#getopacity)
      - [getSelfOpacity](#getselfopacity)
      - [setPosX](#setposx)
      - [setPosY](#setposy)
      - [setWidth](#setwidth)
      - [setHeight](#setheight)
      - [setScaleX](#setscalex)
      - [setScaleY](#setscaley)
      - [setOpacity](#setopacity)
      - [setSelfOpacity](#setselfopacity)
      - [isVisible](#isvisible)
      - [show](#show)
      - [hide](#hide)


Basic syntax
--------------

The schemio syntax is close to Javascript. However it does not have `const`, `let` or `var` keywords for variable declaration. To declare a new variable all you have to do is specify its name and use `=` operator:

Example:
```js
name = "John";
age = 19;
```

As you can see multiple statements are separated by `;` symbol. For any expression, only the last statement is considered a return value. The code below is valid and will return `30`

```js
x = (a = 1; b = 2; a + b); x*10
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


Functions
-------------

#### abs

`abs` takes only a single argument and returns absolute value for that argument.

Example:
```js
y = 1;
x = abs(y);
```

#### min

`min` takes any number of arguments and returns the smallest one.

Example:
```js
y = 1;
z = 2
x = min(0, y, z);
```

#### pow

`pow` returns the value of a base expression taken to a specified power

Example that raises 3 to the power of 2:
```js
pow(3, 2)
```

#### sqrt

`sqrt` returns the square root for specified value

Example (will return `5`)
```js
sqrt(25)
```

#### cos

`cos` returns cosine of specified value

```js
cos(0.4)
```

#### sin

`sin` returns sine of specified value

```js
sin(0.4)
```

#### acos

`acos` returns arc cosine or inverse of cosine

```js
acos(0.9)
```

#### asin

`asin` returns arc sine or inverse of sine

```js
asin(0.9)
```


#### uid

`uid` returns a short unique random generated string

```
id = uid()
```


#### log

`log` print all of its arguments to console in developer tools. Useful for debugging.

```js
x = 4;
y = 2;
log('info:', 'x =', x, 'y =', y)
```


#### round

`round` rounds the specified number to the nearest integer value

```js
x = 3.78;
result = round(x)
```

#### ceil

`ceil` rounds the specified number to the closest larger integer


```js
x = 3.78;
result = ceil(x)
```

#### floor

`floor` rounds the specified number to the closest smaller integer


```js
x = 3.78;
result = floor(x)
```

#### PI

`PI` returns just the PI value which is `3.141592653589793`

Example:
```js
x = R * cos (angle * PI() / 180)
```

#### ifcond

`ifcond` takes 3 arguments and returns either 2nd or 3rd argument depending on the 1st one. It can be used as a conditional expression.

Example:

```js
x = 1;
result = ifcond(x + y > 2, -1, 1);
```

The code above will return `-1` in case if `y` value is `0` and will return `1` if the expression is becomes valid (e.g. when `y` is set to 10).


#### Item functions

Since all the script and condition functions are executed on some particular item, you get access to that items data.

##### setVar

##### getVar

##### getPosX

##### getPosY

##### getWidth

##### getHeight

##### getAngle

##### getScaleX

##### getScaleY

##### getOpacity

##### getSelfOpacity

##### setPosX

##### setPosY

##### setWidth

##### setHeight

##### setScaleX

##### setScaleY

##### setOpacity

##### setSelfOpacity

##### isVisible

##### show

##### hide


Documentation is in progress...