# frag.edit

A VS Code extension which was created for the course "Programming Tools For Data Science" at Heidelberg University.

## Description

This VS Code extension can be used to create, edit and manage code snippets from any language. For the python language, placeholders in code snippets can be calculated alongside with their datatype.
A placeholder is considered as a variable which is used but not declared inside a code snippet.

## Features

- Create an empty Fragment (code snippet along with additional properties)
- Display a list of Fragments in a Tree View
- Edit the properties of a Fragment with a simple editor
- Delete Fragments from the Tree View
- Parametrize code snippets written in python
- Calculate datatypes of placeholders if python code is executable
- Sorting of Fragments in folders by assigning tags to each Fragment

## Usage

When the Extension is installed, a new Tre View Container should appear on the left side of the editor. This container contains the Fragment Editor Tree View. This tree view will pe populated by created Fragments. To create a empty Frgment, click on the box to the top right of the Tree View. Enter the name of the Fragment, then press enter. The name of the Fragment should now appear in the Tree View on the left. If xou click on the name, a editor should open. With this editor, almost avery propertie of the Fragment can be editet and saved with the button 'save' on the top right.

In order to structure the Fragments in folders, the tag property of Fragments can be edited. A tag, when created in the tag property of a Fragment, will appear as a folder in the Tree View and contains all Fragments which have this Tag added to their tag propertie.

In order to create Fragments out of an existing document, select the text you want to add as a snippet, then press the right mouse button. In the appearing menue, press 'Add Fragment' and give it a name. If the document has a '.py' ending, the extension will try to determine placeholders and their datatypes. Corresponding information and warning visualisations will appear. It is important to remember, that in order to determine datatypes, the extension will try to execute the document which contains the selected code snippet. If the doument can not be executed or the (configrable) timeout is reached, no datatypes will be computed.

To execute the python code, the extension uses the (configurable) call statement 'python3' by default.

## External Libraries

- For design of the Fragment editor: https://materializecss.com/
- For calculating a ast in JSON format: https://github.com/fpoli/python-astexport
- For querying the JSON ast: https://www.npmjs.com/package/jsonpath


## TODOs

- Extension not working in it's packaged state ('sql.js' not found)
- Testing
- Algorithm for parametrizing non-python code snippets
- Functionality for importing and exporting the database
- 

## Extension Settings

Following properties of the extension are configurable
- The call statement of python code (f.e. python or python2 or python3)
- The timout of execution when trying to determine the datatypes of placeholders