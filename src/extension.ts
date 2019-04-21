'use strict';

import * as vscode from 'vscode';
import { FragmentProvider, Fragment } from './fragmentProvider';


export function activate(context: vscode.ExtensionContext)
{
	const fragmentProvider = new FragmentProvider();
	vscode.window.registerTreeDataProvider('fragmentEditor', fragmentProvider);
	vscode.commands.registerCommand('fragmentEditor.addEntry', () => fragmentProvider.addEntry());
	vscode.commands.registerCommand('fragmentEditor.editEntry', (fragment: Fragment) => fragmentProvider.editEntry(fragment));
	vscode.commands.registerCommand('fragmentEditor.deleteEntry', (fragment: Fragment) => fragmentProvider.deleteEntry(fragment));
	vscode.commands.registerCommand('fragmentEditor.sqlRequest', () => fragmentProvider.sqlRequest());
}

export function deactivate() {}
