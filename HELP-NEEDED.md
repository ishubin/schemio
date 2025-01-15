Help needed
============

If you find this project interesting and want to contribute but don't know where to start, you could pick out of the following topics:

- [Designing new shapes for Schemio](#designing-new-shapes-for-schemio)
- [Adding new icon packs](#adding-new-icon-packs)
- [Contribute to the interactive knowledgebase on https://schem.io](#contribute-to-the-interactive-knowledgebase-on-httpsschemio)
- [Testing](#testing)
- [Designing new templates](#designing-new-templates)
- [Improve SchemioScript documentation](#improve-schemioscript-documentation)



Designing new shapes for Schemio
--------------------------------

In Schemio editor you can add more shapes to the items menu panel (on the right side) by clicking `More shapes...` button on the bottom. All these shapes are coming from the [assets/shapes](../../tree/master/assets/shapes/) folder and are defined in the [assets/shapes/shapes.json](../../blob/master/assets/shapes/shapes.json) file. You can design these shapes using `Shape Designer` shape pack. There is a short video tutorial available on Youtube: https://www.youtube.com/watch?v=-NpLN3m6jmY.

Couple of rules when designing a shape pack with Shape Designer:

- **Make sure the shape group is relevant to the community**. Don't just add 1 or 2 shapes, make sure that the shapes are going to be useful to the community.
- **Original Schemio Document**. When submitting a PR with new shape group please also include the original Schemio document that was used to design this shape pack. This is needed in case we would need to introduce changes to the shape group in future or to extend it. Please put it in [design/shape-packs](../../tree/master/assets/shapes/) folder. Use [electric-circuit-shapes.schemio.json](../../blob/master/design/shape-packs/electric-circuit-shapes.schemio.json) as an example.
- **Use only "path" shape or primitives from Shape Designer**. `path` shape is the only shape supported outside of `Shape Designer` pack. If you need primitives like a rectangle, ellipse or circle: use the ones provided in the `Shape Designer` pack
- **Every shape should have its outline duplicated**. In Schemio every shape actually consists of two elements: the actual shape that is rendered on scene and the outline that is used to define its event layer, to highlight the item and to attach connectors to it. Take a look at how this is implemented in [electric-circuit-shapes.schemio.json](../../blob/master/design/shape-packs/electric-circuit-shapes.schemio.json) by importing this JSON file in your Schemio Editor.
- **Shape group ID should be unique and consise**. Please make sure that your shape group ID does not clash with existing shape groups and is properly named without spaces or special characters. Use only lower-case leters, digits, `_` and `-` symbols.
- **Export your shape group into the right folder and add it to the shapes index file**. All shapes groups are stored in [assets/shapes](../../tree/master/assets/shapes/) and they are only included in the editor if the shape entry is added to the [assets/shapes/shapes.json](../../blob/master/assets/shapes/shapes.json) file.
- **Test your shape group before submitting it**. Before submitting your PR with your new shape group please test it locally


Adding new icon packs
-----------------------
Similar to the shape groups Schemio provides support for extending the shape menu panel with additional icon sets.
All icon packs are stored in [assets/art](../../tree/master/assets/art/) folder. The main entry for art packs is in [assets/art/art.json](../../blob/master/assets/art/art.json) file. This file is just a short list of all the available art packs with the name, author, preview icons, description and a reference to the art pack JSON file.


Rules for adding icon packs:

- First file an issue with the description of the icon pack and the link to the original icon pack. Before making any progress on this, discuss with the maintainers whether this icon pack is relevant to the community.
- Since the icon packs are distributed with Schemio, it is important to ensure that there is no collision with the original icon set license. Please include the link to the original icon set into the JSON file and also in the PR. Choose only the icon packs with the license that allows distribution for commercial use or that only require a link back to the author or to the original icon set.


Contribute to the interactive knowledgebase on https://schem.io
---------------------------------------------------------------
Schemio is not just a diagram and prototype editor. Whenever I can, I try to work on the interactive knowledgebase that helps others to get a quick insight on how various technologies work. For example starting with ["What happens when you open a website in your browser"](https://schem.io/projects/site-reliability-engineering-t4kEQtKNxpSvZG0b/docs/what-happens-when-you-enter-a-website-in-a-browser-USqkMRHEY7JZav9t) that demonstrates the process of everything that is happening behind the scene on the Internet. Documenting and creating these interactive scenes is a long and time-consuming process but I am trying to do my best to keep extending it. Once I get more time, I would like to continue creating more interactive demos in various topics. For instance here is what I am considering working in the future

- Site Reliability Engineering
- System Design
- Coding algorithms

Obviously you might have a different set of interests. I encourage you to create your own projects and invite anyone who can help you with the documentation. Treat it like a Wikipedia for diagrams.

If you want to join an existing project and become an author, first start by making a patch request to an existing document in that project. If you want to add a document to the existing project you would need to ask the project maintainers to create an empty document in the project and only then you can create a patch for it. If there is enough trust you can be added as a project contributor and you will have direct editor access to any document in the project.


Testing
-----------
Schemio is a very complex application. There are numerous ways of deploying it, e.g.: a docker container, a library, a standalone player, Google Drive as a backend, desktop version powered by Electron etc. You can imagine that maintaining and extending such a massive project is quite demanding. That is why we need your help with testing it and reporting any issues you find.


Designing new templates
-----------------------
Schemio has a unique system of templates that can enhance the diagram editing experience. For example templates like: Mind Map, Slider, Popup, Slides, Tooltip, App Prototype etc. These templates extend the Schemio editor with additional controls and help users generating complex structures in their documents. Not only that, another important aspects of templates is that they offer a solution for dynamic extension of Schemio editor, thus rebuilding and redeploying Schemio is not necessary.

But the catch is you need to learn the Schemio JSON templating syntax. Unfortunately this is not fully documented anywhere, but, if you are interested you could also help with the documentation as well.

All the templates are located in [assets/templates/](../../tree/master/assets/templates) folder. The main templates entry is [assets/templates/index.json](../../blob/master/assets/templates/index.json) file. This index file is loaded in Schemio editor and is used to display all available templates in the shape menu panel. Each template entry is just a reference to another JSON file which is how the templates are stored. You might notice that some templates are stored in both JSON and YAML format. That is because their YAML file is the working document and JSON file is built with [build-template-index.py](../../blob/master/build-template-index.py) script. This allows us to separate any scripts used in the template into separate files. The easiest way to learn about it is seeing how "Slides" template is built in [assets/templates/ui/slides.yaml](../../blob/master/assets/templates/ui/slides.yaml) file. If you want to check something more advanced you can look at the "Mind map" template in [assets/templates/diagrams/mind-map.yaml](../../blob/master/assets/templates/diagrams/mind-map.yaml)


Improve SchemioScript documentation
------------------------------------

Currently the SchemioScript language is documented here: https://github.com/ishubin/schemio/blob/master/docs/Scripting.md
But this documentation is not very practical as it is not easy to search for the functions you are interested in. Building a better dcoumentation is on the roadmap, but if you feel like you know a better way already and can contribute - file an issue and lets discuss it.
