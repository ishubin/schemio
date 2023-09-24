Schemio Scripting Language
===========================

Schemio offers a possibility of simple scripting. At this moment the Schemio scripting language is still in development and very limited in features. It does not support if statements or for loops.

- [Basic syntax](#basic-syntax)
- [Boolean expressions](#boolean-expressions)
- [Functions](#functions)
      - [abs](#abs)
      - [min](#min)


Basic syntax
--------------

The schemio syntax is close to Javascript. However it does not have `const`, `let` or `var` keywords for variable declaration. To declare a new variable all you have to do is specify its name and use `=` operator:

Example:
```js
name = "John";
age = 19;
```

As you can see multiple statements are separated by `;` symbol.


Boolean expressions
-------------------

Boolean expressions are implemented the same way as in C. You may use the following operators

- `==`: Equality operator `x == y + 5`
- `!=`: Inequality operator `x != y + 5`
- `>`, `<`, `>=`, `<=`: comparison operators `x > (y + 2)*6` or `x <= 23`
- `&&`: AND operator `x > (y + 2)*6 && x <= 23`
- `||`: OR operator `x > (y + 2)*6 || x <= 23`



Functions
-------------

##### abs

`abs` takes only a single argument and returns absolute value for that argument.

Example:
```js
y = 1;
x = abs(y);
```

##### min

`min` takes any number of arguments and returns the smallest on.

Example:
```javascript
y = 1;
z = 2
x = min(0, y, z);
```


Documentation is in progress...