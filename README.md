Schemio
--------------------

Schemio is a web based diagramming app that allows you to build interactive diagrams. Although originally Schemio was not designed for this, but it is also possible to use it as a prototyping app.

Features of Schemio:

- Creating interactive diagrams
- Documenting individual items in your diagrams
- Linking diagrams. You can add links to other diagrams or to external documents
- Component based diagrams: you can load diagrams dynamically inside of each other. This allows you to manage your digrams better and lets the user discover more and more while staying in original document
- Frame animation editor: t is possible to use frame based animations for any property.
- Draw free-form shapes
- Relative transformations: you can attach items to other items in your diagrams and tweak rotation, pivot point and scale
- Behavior editor: you can assign event handlers to any item (events like: init, click, mouse in, mouse out)
- Various animation functions: you can have smooth transitions like fade in or fade out, move items, render particle effect etc.
- Export entire diagram or only selected objects as SVG
- Generate static version of all of your diagrams so that you can host it anywhere, even on GitHub pages


![Scheenshot of Schemio](https://github.com/ishubin/schemio/blob/master/docs/schemio-screenshot.png?raw=true)

![Scheenshot of Schemio](https://github.com/ishubin/schemio/blob/master/docs/schemio-screenshot-2.png?raw=true)


Demo: What happens when you open a website in your browser
----------------------------------------------------------

There is a demo, built with Schemio that contains interactive diagrams that answer a popular interview question: "What happens when you open a website in your browser".

* Demo: https://ishubin.github.io/sre-knowledge-base/#/docs/what-happens-when.
* Source code: https://github.com/ishubin/sre-knowledge-base


Introduction to interactive diagrams with Schemio (Youtube video)
-------------------------------------------------

[![IMAGE ALT TEXT](http://img.youtube.com/vi/NM2RS1JhRkk/0.jpg)](http://www.youtube.com/watch?v=NM2RS1JhRkk "Introduction to interactive diagrams with Schemio")

Configuration
---------------

You can configure Schemio via the following environent variables

| Env var                | Default value  | Description |
| ---------------------- | -------------- | ----------- |
| `SERVER_PORT`          | `4010`         | Server listening port |
| `FS_ROOT_PATH`         | `/opt/schemio` | Path to Schemio storage on file system. This is where it will store all your diagrams and uploaded files |
| `FILE_UPLOAD_MAX_SIZE` | `10485760`     | Upload size limit for media files |
| `VIEW_ONLY_MODE`       | `false`        | If set to true - it does not allow editing, only viewing of folders and diagrams |


Running with Docker
--------------------

Dockerized version of Schemio is available here: https://hub.docker.com/repository/docker/binshu/schemio

You can run it like this:

```
docker pull binshu/schemio:latest

docker run -v "$(pwd):/opt/schemio" \
    -p 4010:4010 \
    -e FS_ROOT_PATH=/opt/schemio \
    -e SERVER_PORT=4010 \
    binshu/schemio:latest
```

Don't forget to pull latest changes as Schemio is frequently updated.


```

        * B
       /
      * A    x1,y1 - world point

   * C  x2,y2 - world point
  /
 * D


Fsw = Fscreen_to_world(mx, my) = {x: mx * s + x0, y: my * s + y0}
Fws = Fworld_to_screen(x, y) = {mx: (x - x0)/s, my: (y - y0)/s}



x1,y1 = Fsw(Ax, Ay)
x2,y2 = Fsw(Cx, Cy)

x1 = Ax * s + x0
y1 = Ay * s + y0

x2 = Cx * s + x0
y2 = Cy * s + y0

x1 = Bx * s' + x0'
y1 = By * s' + y0'

x2 = Dx * s' + x0'
y2 = Dy * s' + y0'


Ax * s + x0 = Bx * s' + x0'
Ay * s + y0 = By * s' + y0'

Cx * s + x0 = Dx * s' + x0'
Cy * s + y0 = Dy * s' + y0'


Ax * s + x0 = Bx * s' + x0'
Cx * s + x0 = Dx * s' + x0'
Ay * s + y0 = By * s' + y0'
Cy * s + y0 = Dy * s' + y0'

Ax * s - Cx * s = Bx * s' - Dx * s'
Ay * s - Cy * s = By * s' - Dy * s'

(Ax - Cx)*s = (Bx - Dx)*s'

         (Ax - Cx)*s
s'(1) =  -----------
         (Bx - Dx)

         (Ay - Cy)*s
s'(2) =  -----------
         (By - Dy)

# choose s' that was calculdated with biggest denominator
# once we know s', we can calculate x0'


x0'(1) = Ax * s + x0 - Bx * s'
x0'(2) = Cx * s + x0 - Dx * s'

y0'(1) = Ay * s + y0 - By * s'
y0'(2) = Cy * s + y0 - Dy * s'

# the final solution will be average of the two

x0' = (x0'(1) + x'(2)) / 2
y0' = (y0'(1) + y'(2)) / 2

```

p1 = (126, 421)
p2 = (238, 412)
P1 = (54, 418)
P2 = (307, 396)

const denomX = (p1.x - P1.x) = 126 - 54 = 72;
const denomY = (p2.y - P2.y) = 412 - 396 = 16;


Different way


let wp1 and wp2 - the initial two touches from two fingers in world transform
let P1 and P2 - moved positions of two touches from two fingers in screen transform

  / P1.x = (wp1.x - x0') / s'
 /  P1.y = (wp1.y - y0') / s'
 \  P2.x = (wp2.x - x0') / s'
  \ P2.y = (wp2.y - y0') / s'

  / P1.x * s' = wp1.x - x0'
 /  P1.y * s' = wp1.y - y0'
 \  P2.x * s' = wp2.x - x0'
  \ P2.y * s' = wp2.y - y0'

P1.x * s' - P2.x * s' = wp1.x - wp2.x
s'(1) = (wp1.x - wp2.x) / (P1.x - P2.x)
s'(2) = (wp1.y - wp2.y) / (P1.y - P2.y)

x0' = wp1.x - P1.x * s'
y0' = wp1.y - P1.y * s'



wp1.x = (p1.x - x0) / s
wp1.y = (p1.y - y0) / s

wp1.x = (P1.x - x0') / s'

wp1.x * s' = P1.x - x0'
wp2.x * s' = P2.x - x0'

(wp1.x - wp2.x) * s' = P1.x - P2.x

s' = (P1.x - P2.x)/ (wp1.x - wp2.x)
x0' = wp1.x * s' - P1.x




License
---------

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
