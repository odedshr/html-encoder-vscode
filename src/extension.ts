// https://code.visualstudio.com/api/working-with-extensions/publishing-extension#vsce

import {
  Disposable,
  ExtensionContext,
  TextDocument,
  window,
  workspace
} from 'vscode';
import { writeFileSync } from 'fs';
import { normalize } from 'path';
import htmlEncoder, { TargetType } from 'html-encoder';

type Target = { path: string; type: TargetType; ssr: boolean };
const allTargetsPattern = /(\<\?out(\:ssr)?\s?(.*?)\s?\?\>)*$/gim;
const targetPattern = /out(\:ssr)?\s? (.*?)\s?\?/gm;

let handler: undefined | Disposable;

/**
 * Dispose formatters
 */
function disposeHandler() {
  if (handler) {
    handler.dispose();
  }

  handler = undefined;
}


export function activate(context: ExtensionContext) {
  disposeHandler();

  handler = workspace.onDidSaveTextDocument(
    (document: TextDocument) => ifIsHTMLTemplate(document) && transpile(document)
  );
}

function ifIsHTMLTemplate(document: TextDocument): boolean {
  return !!document.uri.path.match(/template\.html$/);
}

function transpile(document: TextDocument) {
  const source = getSourcePosition(document.uri.path);

  let text: string = document.getText();
  findTargets(document.uri.path, text).forEach(target => {
    try {
      writeFileSync(target.path, htmlEncoder(text.replace(allTargetsPattern, ''), target.type, target.ssr));
      window.showInformationMessage(` Encoded ${target.path.replace(source.folder, '.')}`);
    }
    catch (err) {
      console.error(target.path, err);
      window.showInformationMessage(` Failed encoding ${target.path.replace(source.folder, '.')}: ${err}`);
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
          type: getTargetType(match[2]),
          path: normalize(getTargetPath(sourcePath, target[1].replace(/\?$/, '').replace(/\.es$/i, '.js'))),
          ssr: !!target[1] && target[1].match(/\s?ssr/i) !== null,
        });
      }
    });
  } catch (err) {
    window.showInformationMessage(err);
    console.error(err);
  }

  // return default target
  if (!targets.length) {
    targets.push({
      type: 'json',
      ssr: false,
      path: `${sourcePath.replace(/\.html?$/, '')}.js`,
    });
  }

  return targets;
}

function getTargetType(filename: string = ''): TargetType {
  if (filename.match(/\.ts\??\b/i) !== null) {
    return 'ts';
  } else if (filename.match(/\.es\??\b/i) !== null) {
    return 'es';
  } else if (filename.match(/\.js\??\b/i) !== null) {
    return 'js';
  }

  return 'json';
}

function getSourcePosition(source: string) {
  const sourceFileNameIndex = source.lastIndexOf('/');
  return {
    file: source.substr(sourceFileNameIndex + 1),
    folder: source.substr(0, sourceFileNameIndex)
  };
}

function getTargetPath(source: string, target: string) {
  const sourceDetails = getSourcePosition(source);
  if (target.split('*').length === 2) {
    target = target.replace(/\*/, sourceDetails.file.replace(/\.html?$/, ''));
  }

  if (source === target || sourceDetails.file === target) { // same file
    return `${source}.${getExtension(source)}`;
  } else if (target[0] === '/') { // absolute path
    return target;
  }

  return `${sourceDetails.folder}/${target}`;
}

function getExtension(path: string) { //this function is placeholder for future outputs
  const extension = path.split('.').pop() || '';
  return (['js', 'ts'].indexOf(extension)) ? extension : 'json';
}

// this method is called when your extension is deactivated
export function deactivate() { }
