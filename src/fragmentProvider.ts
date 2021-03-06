import * as vscode from 'vscode';
import { Fragment } from "./fragment";
import { Database } from './database';
import { FragmentEditor } from './fragmentEditor';
import { TreeItem } from './treeItem';
import { PyPa } from './parametrization';

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
                    return !!(treeItem !== undefined && treeItem.label !== undefined && treeItem.hasTag() === false);
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
     * Add an empty fragment
     */
    addEmptyFragment(): void {
        const db: Database = Database.getInstance();
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
                // Add empty Fragment
                var newFragment = new Fragment({ label: label });
                db.addFragment(newFragment);
                vscode.window.showInformationMessage("Added Empty Fragment");
                this.refresh();
            }
        });
    }

    /**
     * Creates a new fragment by opening a input dialog to enter a new label
     */
    addFragment(): void {
        var editor = vscode.window.activeTextEditor;
        var selection: vscode.Selection | undefined = undefined;
        var textDocument: vscode.TextDocument | undefined = undefined;
        const db: Database = Database.getInstance();

        if (editor !== undefined) {
            selection = editor.selection;
            textDocument = editor.document;
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
                if (editor !== undefined && textDocument !== undefined && selection !== undefined) {
                    if (textDocument.fileName.match(/.*\.py$/)) {
                        var result = PyPa.parametrizeWithDatatypes(textDocument, selection);
                        result.then(obj => {
                            // Add Fragment with parametrization and datatypes
                            var newFragment = new Fragment({ ...{ label: label }, ...obj });
                            db.addFragment(newFragment);
                            this.refresh();
                            vscode.window.showInformationMessage("Successfully Added Parametrized Fragment With Datatypes");
                        }, (err: any) => {
                            console.log("[W] | [FragmentProvider | addFragment]: Failed to calculate datatypes for placeholders");
                            var result = PyPa.parametrize(textDocument!, selection!);
                            result.then(obj => {
                                // Add Fragment with parametrization
                                var newFragment = new Fragment({ ...{ label: label }, ...obj });
                                db.addFragment(newFragment);
                                this.refresh();
                                vscode.window.showInformationMessage("Successfully Added Parametrized Fragment (without datatypes)");
                            }, (err: any) => {
                                // Add Fragment
                                console.log("[W] | [FragmentProvider | addFragment]: Failed to calculate parametrized fragment");
                                var body = textDocument!.getText(new vscode.Range(selection!.start, selection!.end));
                                var newFragment = new Fragment({ label: label, body: body });
                                db.addFragment(newFragment);
                                this.refresh();
                                vscode.window.showInformationMessage("Added Fragment");
                            })
                        });
                    } else {
                        // Add Fragment 
                        var body = textDocument.getText(new vscode.Range(selection.start, selection.end));
                        var newFragment = new Fragment({ label: label, body: body });
                        db.addFragment(newFragment);
                        vscode.window.showInformationMessage("Added Fragment");
                        this.refresh();
                    }
                } else {
                    // Add empty Fragment
                    var newFragment = new Fragment({ label: label });
                    db.addFragment(newFragment);
                    vscode.window.showInformationMessage("Added Empty Fragment");
                    this.refresh();
                }
            }
        });
    }

    /**
     * Deletes a TreeItemcorresponding to a Fragment. In case the TreeItem is a tag, the tag gets deleted from the Fragment, in case it is a Fragment, the Fragment gets deleted
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
