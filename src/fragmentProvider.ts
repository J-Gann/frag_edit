import * as vscode from 'vscode';
import { Fragment } from "./fragment";
import { Database } from './database';
import { FragmentEditor } from './fragmentEditor';
import { FOEF, PyPa } from './parametrization';
import { TreeItem } from './treeItem';

/**
 * Provides TreeItems that should be displayed in a tree view
 */
export class FragmentProvider implements vscode.TreeDataProvider<TreeItem> {
    static context: vscode.ExtensionContext;
    private _fragmentEditor: FragmentEditor;
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined> = new vscode.EventEmitter<TreeItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined> = this._onDidChangeTreeData.event;

    constructor(context: vscode.ExtensionContext) {
        this.createTreeStructure();
        FragmentProvider.context = context;
        this._fragmentEditor = new FragmentEditor(context, this);
    }

    /**
     * Creates all necessary TreeItems after it deletes all previous TreeItems
     */
    createTreeStructure() {
        const db: Database = Database.getInstance();
        // Clear existing TreeItems
        db.loadedTreeItems = [];

        const fragments = db.getFragments();
        if (fragments !== undefined) {
            fragments.forEach((fragment: Fragment) => {
                if (fragment !== undefined) {
                    const tags = fragment.tags;
                    if (tags !== undefined && tags.length !== 0) {
                        const tagList = tags.split(',');
                        tagList.forEach((tag: string) => {
                            if (tag.length !== 0 && tag !== ',') {
                                if (db.getTreeItem(tag) === undefined) {
                                    const newTag = new TreeItem({ label: tag, contextValue: "tag" });
                                    db.addTreeItem(newTag);
                                }
                                const newFragment = new TreeItem({
                                    label: fragment.label + " [TAG:" + tag + "]",
                                    contextValue: "fragment",
                                    tag: tag,
                                    fragment: fragment.label
                                });
                                db.addTreeItem(newFragment);
                                const tagTreeItem = db.getTreeItem(tag);
                                if (tagTreeItem !== undefined) {
                                    tagTreeItem.addChild(newFragment.label);
                                }
                            }
                        });
                    } else {
                        const treeItem = new TreeItem({
                            label: fragment.label,
                            contextValue: "fragment",
                            fragment: fragment.label
                        });
                        db.addTreeItem(treeItem);
                    }
                }
            });
        }
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    /**
     * Return list of fragments that are displayed in the tree
     */
    getChildren(element?: TreeItem): Thenable<TreeItem[]> {
        const db: Database = Database.getInstance();
        if (element !== undefined) {
            const elementList = db.getTreeItems(element.childs);
            if (elementList !== undefined) {
                return Promise.resolve(elementList);
            } else {
                console.log("[E] | [FragmentProvider | getChildren]: List of childs for TreeItem undefined");
                return Promise.resolve([]);
            }
        } else {
            const rootList = db.getTreeItems();
            if (rootList !== undefined) {
                return Promise.resolve(rootList.filter((treeItem: TreeItem) => {
                    return !!(treeItem !== undefined && treeItem.label !== undefined && treeItem.hasTag());
                }));
            } else {
                console.log("[E] | [FragmentProvider | getChildren]: List of TreeItems undefined");
                return Promise.resolve([]);
            }
        }
    }

    /**
     * Refresh the displayed list of fragments
     */
    refresh(): void {
        this.createTreeStructure();
        this._onDidChangeTreeData.fire();
    }

    /**
     * Opens the editor for the given fragment
     * @param treeItem
     */
    editFragment(treeItem: TreeItem | undefined): void {
        const db: Database = Database.getInstance();
        if (treeItem !== undefined && treeItem.contextValue === "fragment" && treeItem.fragment !== undefined && db.getFragment(treeItem.fragment) !== undefined) {
            this._fragmentEditor.showFragment(db.getFragment(treeItem.fragment));
            this.refresh();
        } else {
            console.log("[W] | [FragmentProvider | editFragment]: Can not edit Fragment with the label: " + treeItem!.label);
        }
    }

    /**
     * Creates a new fragment by opening a input dialog to enter a new label
     */
    addFragment(): void {
        var editor = vscode.window.activeTextEditor;
        var selection: vscode.Selection;
        var textDocument: vscode.TextDocument;

        const db: Database = Database.getInstance();

        if (editor) {
            selection = editor.selection;
            textDocument = editor.document;
        } else {
            vscode.window.showInformationMessage("No editor found");
        }

        const input = vscode.window.showInputBox({ prompt: "Input a label for the Fragment" });
        input.then((label) => {
            if (label === "") {
                vscode.window.showErrorMessage("Fragment Not Added (no empty label allowed)");
                console.log("[W] | [FragmentProvider | addFragment]: Failed");
            } else if (label === undefined) {
                vscode.window.showErrorMessage("Fragment Not Added");
                console.log("[W] | [FragmentProvider | addFragment]: Failed");
            } else if (db.getTreeItem(label)) {
                vscode.window.showErrorMessage("Fragment Not Added (label has to be unique)");
                console.log("[W] | [FragmentProvider | addFragment]: Failed");
            } else {
                //var obj = FOEF.parametrize(text);
                //var newFragment = new Fragment({...{label: label}, ...obj});
                //Database.addFragment(newFragment);
                if (editor !== undefined && textDocument.fileName.match(/.*\.py$/)) {
                    var result = PyPa.parametrize(textDocument, selection);
                    if(result !== undefined) {
                        result.then(obj => {
                            var newFragment = new Fragment({...{label: label}, ...obj});
                            db.addFragment(newFragment);
                            this.refresh();
                            vscode.window.showInformationMessage("Successfully Added Parametrized Fragment");
                        },
                        (err: any) => {
                            vscode.window.showErrorMessage("Parametrization Failed. Python Code not executable?");
                            console.log("[W] | [FragmentProvider | addFragment]: Failed: " + err);
                            var body = textDocument.getText(new vscode.Range(selection.start, selection.end));
                            var newFragment = new Fragment({ label: label, body: body });
                            db.addFragment(newFragment);
                            this.refresh();
                            vscode.window.showInformationMessage("Added Fragment without Parametrization");
                        });
                    } else {
                        vscode.window.showInformationMessage("No Placeholders found");
                        var body = textDocument.getText(new vscode.Range(selection.start, selection.end));
                        var newFragment = new Fragment({label: label, body: body});
                        db.addFragment(newFragment);
                        vscode.window.showInformationMessage("Added Fragment without Parametrization");
                        this.refresh();
                    }
                } else if (selection !== undefined) {
                    var body = textDocument.getText(new vscode.Range(selection.start, selection.end));
                    var newFragment = new Fragment({ label: label, body: body });
                    db.addFragment(newFragment);
                    if (!textDocument.fileName.match(/.*\.py$/)) {
                        vscode.window.showInformationMessage("Parametrization only Supported for Python");
                    }
                    vscode.window.showInformationMessage("Added Fragment without Parametrization");
                    this.refresh();
                } else {
                    var newFragment = new Fragment({ label: label });
                    db.addFragment(newFragment);
                }
            }
        });
    }

    /**
     * Deletes a TreeItemcorresponding to a Fragment. This deletes the tag corresponding to this TreeItem in the properties of the Fragment.
     * @param treeItem
     */
    deleteTreeItem(treeItem: TreeItem): void {
        const db: Database = Database.getInstance();
        if (treeItem.contextValue === "fragment" && treeItem.fragment !== undefined && db.getFragment(treeItem.fragment) !== undefined) {
            const fragment = db.getFragment(treeItem.fragment);
            if (fragment !== undefined) {
                if (fragment.tags !== undefined && fragment.tags.length === 0) {
                    db.deleteFragment(fragment.label);
                } else if (fragment.tags !== undefined) {
                    fragment.removeTag(treeItem.tag);
                    db.updateFragment(fragment);
                }
                this.refresh();
            } else {
                console.log("[W] | [FragmentProvider | deleteTreeItem]: Can not delete tag: " + treeItem.tag);
            }
        } else {
            console.log("[W] | [FragmentProvider | deleteTreeItem]: Can not delete TreeItem with the label: " + treeItem.label);
        }
    }
}
