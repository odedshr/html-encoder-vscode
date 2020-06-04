import * as vscode from 'vscode';
import { join } from 'path';
import { writeFileSync, existsSync, mkdirSync, rmdirSync, lstatSync, readdirSync, unlinkSync } from 'fs';

export async function saveFile(filename: string, originalContent: string, addContent: string = '') {
  writeFileSync(filename, originalContent, 'utf8');

  const openPath = vscode.Uri.parse("file://" + filename); //A request file path
  const doc: vscode.TextDocument = await vscode.workspace.openTextDocument(openPath);
  const editor: vscode.TextEditor = await vscode.window.showTextDocument(doc);

  editor.edit(editBuilder => {
    const lineCount = doc.lineCount - 1;
    editBuilder.replace(new vscode.Position(lineCount, doc.lineAt(lineCount).text.length), addContent);
  });
  await doc.save();
}

export function addFolder(path: string) {
  let folder = '';
  path.replace(/\/$/, '').split('/').forEach(path => {
    folder += `${path}/`;

    if (!existsSync(folder)) {
      mkdirSync(folder);
    }
  });
}

export function removeFolder(folder: string) {
  if (existsSync(folder)) {
    readdirSync(folder).forEach(file => {
      const curPath = join(folder, file);
      if (lstatSync(curPath).isDirectory()) { // recurse
        removeFolder(curPath);
      } else { // delete file
        unlinkSync(curPath);
      }
    });
    rmdirSync(folder);

  }
}