// https://code.visualstudio.com/api/working-with-extensions/publishing-extension#vsce

import { normalize } from 'path';
import { TargetType } from './htmlEncoder';

export type Target = { path: string; type: TargetType; ssr: boolean };
export const allTargetsPattern = /(\<\?out(\:ssr)?\s?(.*?)\s?\?\>)*$/gim;
const targetPattern = /out(\:ssr)?\s? (.*?)\s?\?/gm;

export default function findTargets(sourcePath: string, fullText: string): Target[] {
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
    console.error(err);
  }

  // return default target
  if (!targets.length) {
    targets.push({
      type: 'js',
      ssr: false,
      path: `${sourcePath.replace(/\.html?$/, '')}.js`,
    });
  }

  return targets;
}

function getTargetType(filename: string = ''): TargetType {
  if (filename.match(/\.ts\??$/i) !== null) {
    return 'ts';
  } else if (filename.match(/\.es\??$/i) !== null) {
    return 'es';
  }

  return 'js';
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