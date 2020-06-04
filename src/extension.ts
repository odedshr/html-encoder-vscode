// https://code.visualstudio.com/api/working-with-extensions/publishing-extension#vsce

import * as vscode from 'vscode';
import { writeFileSync } from 'fs';
import { normalize } from 'path';
import htmlEncoder from './htmlEncoder';

type Target = { path: string; ts: boolean; ssr: boolean };
const allTargetsPattern = /(\<\?out(\:ssr)?\s?(.*?)\s?\?\>)*$/gim;
const targetPattern = /out(\:ssr)?\s? (.*?)\s?\?/gm;

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(registerHtmlEncoder('html-encoder'));
}

export function registerHtmlEncoder(selector: vscode.DocumentSelector): vscode.Disposable {
  return vscode.languages.registerDocumentFormattingEditProvider(selector, {
    provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
      let text: string = document.getText();
      const source = getSourcePosition(document.uri.path);
      findTargets(document.uri.path, text).forEach(target => {
        vscode.window.showInformationMessage(` Encoded ${target.path.replace(source.folder, '.')}`);
        writeFileSync(target.path, htmlEncoder(text.replace(allTargetsPattern, ''), target.ts, target.ssr));
      });

      return [];
    }
  });
}

function findTargets(sourcePath: string, fullText: string): Target[] {
  const targets: Target[] = [];
  let match;
  try {
    ((fullText.match(allTargetsPattern) || []).filter((s) => s.length) || []).forEach(tag => {
      while (match = targetPattern.exec(tag)) {
        const target = match[0].split(/\s+/);
        // target= "out[:ssr] filename ?"
        targets.push({
          ts: target[1].match(/\.ts$/i) !== null,
          path: normalize(getTargetPath(sourcePath, target[1].replace(/\?$/, ''))),
          ssr: !!target[2] && target[2].match(/\s?ssr/i) !== null,
        });
      }
    });
  } catch (err) {
    vscode.window.showInformationMessage(err);
    console.error(err);
  }

  // return default target
  if (!targets.length) {
    targets.push({
      ts: false,
      ssr: false,
      path: `${sourcePath.replace(/\.html?$/, '')}.js`,
    });
  }

  return targets;
}

function getSourcePosition(source: string) {
  const sourceFileNameIndex = source.lastIndexOf('/');
  return { file: source.substr(sourceFileNameIndex + 1), folder: source.substr(0, sourceFileNameIndex) };
}

function getTargetPath(source: string, target: string) {
  const sourceDetails = getSourcePosition(source);
  if (target.split('*').length === 2) {
    target = target.replace(/\*/, sourceDetails.file.replace(/\.html?$/, ''));
  }
  if (source === target || sourceDetails.file === target) { // same file
    const ext = (source.match(/\.ts$/i) !== null) ? 'ts' : 'js';
    return `${source}.${ext}`;
  } else if (target[0] === '/') { // absolute path
    return target;
  }

  return `${sourceDetails.folder}/${target}`;
}

// this method is called when your extension is deactivated
export function deactivate() { }
