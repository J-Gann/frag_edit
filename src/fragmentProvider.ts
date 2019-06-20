import * as vscode from 'vscode';
import {Fragment} from "./fragment";
import {Database} from './database';
import {FragmentEditor} from './fragmentEditor';
import {FOEF, PyPa} from './parametrization';
import {TreeItem} from './treeItem';

/**
 * Provides TreeItems that should be displayed in a tree view
 */
export class FragmentProvider implements vscode.TreeDataProvider<TreeItem>
{
    private _fragmentEditor: FragmentEditor;
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem|undefined> = new vscode.EventEmitter<TreeItem|undefined>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem|undefined> = this._onDidChangeTreeData.event;
    static context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext)
    {
        this.createTreeStructure();
        FragmentProvider.context = context;
        this._fragmentEditor = new FragmentEditor(context, this);
    }

    /**
     * Creates all necessary TreeItems after it deletes all previous TreeItems
     */
    createTreeStructure()
    {
        // Clear existing TreeItems
        Database.loadedTreeItems = [];

        var fragments = Database.getFragments();
        if (fragments !== undefined)
        {
            fragments.forEach((fragment: Fragment) => {
                if (fragment !== undefined)
                {
                    var tags = fragment.tags;
                    if (tags !== undefined && tags.length !== 0)
                    {
                        var tagList = tags.split(',');
                        tagList.forEach((tag: string) => {
                            if (tag.length !== 0 && tag !== ',')
                            {
                                if (Database.getTreeItem(tag) === undefined)
                                {
                                    var newTag = new TreeItem({label : tag, contextValue : "tag"});
                                    Database.addTreeItem(newTag);
                                }
                                var newFragment = new TreeItem({label : fragment.label + " [TAG:" + tag + "]", contextValue : "fragment", tag : tag, fragment : fragment.label});
                                Database.addTreeItem(newFragment);
                                var tagTreeItem = Database.getTreeItem(tag);
                                if (tagTreeItem !== undefined)
                                {
                                    tagTreeItem.addChild(newFragment.label);
                                }
                            }
                        });
                    }
                    else
                    {
                        var treeItem = new TreeItem({label : fragment.label, contextValue : "fragment", fragment : fragment.label});
                        Database.addTreeItem(treeItem);
                    }
                }
            });
        }
    }

    getTreeItem(element: TreeItem): vscode.TreeItem
    {
        return element;
    }

    /**
     * Return list of fragments that are displayed in the tree
     */
    getChildren(element?: TreeItem): Thenable<TreeItem[]>
    {
        if (element !== undefined)
        {
            var elementList = Database.getTreeItems(element.childs);
            if (elementList !== undefined)
            {
                return Promise.resolve(elementList);
            }
            else
            {
                console.log("[E] | [FragmentProvider | getChildren]: List of childs for TreeItem undefined");
                return Promise.resolve([]);
            }
        }
        else
        {
            var rootList = Database.getTreeItems();
            if (rootList !== undefined)
            {
                return Promise.resolve(rootList.filter((treeItem: TreeItem) => {
                    if (treeItem !== undefined && treeItem.label !== undefined && treeItem.tag === undefined)
                    {
                        return true;
                    }
                    else
                    {
                        return false;
                    }
                }));
            }
            else
            {
                console.log("[E] | [FragmentProvider | getChildren]: List of TreeItems undefined");
                return Promise.resolve([]);
            }
        }
    }

    /**
     * Refresh the displayed list of fragments
     */
    refresh(): void
    {
        this.createTreeStructure();
        this._onDidChangeTreeData.fire();
    }

    /**
     * Opens the editor for the given fragment
     * @param fragment Fragment that should be edited
     */
    editFragment(treeItem: TreeItem|undefined): void
    {
        if (treeItem !== undefined && treeItem.contextValue === "fragment" && treeItem.fragment !== undefined && Database.getFragment(treeItem.fragment) !== undefined)
        {
            this._fragmentEditor.showFragment(Database.getFragment(treeItem.fragment));
            this.refresh();
        }
        else
        {
            console.log("[W] | [FragmentProvider | editFragment]: Can not edit Fragment with the label: " + treeItem!.label);
        }
    }

    /**
     * Creates a new fragment by opening a input dialog to enter a new label
     */
    addFragment(): void
    {
        var editor = vscode.window.activeTextEditor;
        var selection: vscode.Selection;
        var textDocument: vscode.TextDocument;

        if (editor)
        {
            selection = editor.selection;
            textDocument = editor.document;
        }
        else
        {
            vscode.window.showErrorMessage("No editor found");
            console.log("[W] | [FragmentProvider | addFragment]: Failed");
        }

        var input = vscode.window.showInputBox({prompt : "Input a label for the Fragment"});
        input.then((label) => {
            if (label === "")
            {
                vscode.window.showErrorMessage("Fragment Not Added (no empty label allowed)");
                console.log("[W] | [FragmentProvider | addFragment]: Failed");
            }
            else if (label === undefined)
            {
                vscode.window.showErrorMessage("Fragment Not Added");
                console.log("[W] | [FragmentProvider | addFragment]: Failed");
            }
            else if (Database.getTreeItem(label))
            {
                vscode.window.showErrorMessage("Fragment Not Added (label has to be unique)");
                console.log("[W] | [FragmentProvider | addFragment]: Failed");
            }
            else
            {
                //var obj = FOEF.parametrize(text);
                //var newFragment = new Fragment({...{label: label}, ...obj});
                //Database.addFragment(newFragment);
                if(textDocument.fileName.match(/.*\.py$/) && editor !== undefined)
                {
                    PyPa.parametrize(textDocument, selection).then(obj =>
                        {
                            var newFragment = new Fragment({...{label : label}, ...obj});
                            Database.addFragment(newFragment);
                            this.refresh();
                            vscode.window.showInformationMessage("Successfully Added Parametrized Fragment");
                        },
                        (err: any) =>
                        {
                            vscode.window.showErrorMessage("Parametrization Failed. Python Code not executable?");
                            var body = textDocument.getText(new vscode.Range(selection.start, selection.end));
                            var newFragment = new Fragment({label: label, body: body});
                            Database.addFragment(newFragment);
                            this.refresh();
                            vscode.window.showInformationMessage("Added Fragment without Parametrization");
                        });
                }
                else if(editor !== undefined && selection !== undefined)
                {
                    var body = textDocument.getText(new vscode.Range(selection.start, selection.end));
                    var newFragment = new Fragment({label: label, body: body});
                    Database.addFragment(newFragment);
                    if(!textDocument.fileName.match(/.*\.py$/))
                    {
                        vscode.window.showInformationMessage("Parametrization only Supported for Python");
                    }
                    this.refresh();
                }
                else
                {
                    var newFragment = new Fragment({label: label});
                    Database.addFragment(newFragment);
                }
            }
        });
    }

    /**
     * Deletes a TreeItemcorresponding to a Fragment. This deletes the tag corresponding to this TreeItem in the properties of the Fragment.
     * @param fragment Fragment that should be deleted
     */
    deleteTreeItem(treeItem: TreeItem): void
    {
        if (treeItem.contextValue === "fragment" && treeItem.fragment !== undefined && Database.getFragment(treeItem.fragment) !== undefined)
        {
            var fragment = Database.getFragment(treeItem.fragment);
            if (fragment !== undefined)
            {
                if (fragment.tags !== undefined && fragment.tags.length === 0)
                {
                    Database.deleteFragment(fragment.label);
                }
                else if (fragment.tags !== undefined)
                {
                    fragment.removeTag(treeItem.tag);
                    Database.updateFragment(fragment);
                }
                this.refresh();
            }
            else
            {
                console.log("[W] | [FragmentProvider | deleteTreeItem]: Can not delete tag: " + treeItem.tag);
            }
        }
        else
        {
            console.log("[W] | [FragmentProvider | deleteTreeItem]: Can not delete TreeItem with the label: " + treeItem.label);
        }
    }
}
