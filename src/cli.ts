import { basename, join } from 'path';
import { existsSync, readFileSync, writeFileSync, lstatSync, mkdirSync, readdirSync, rmdirSync, unlinkSync } from 'fs';
import { watch } from 'chokidar';
import htmlEncoder, { TargetType } from './htmlEncoder';

type TargetDef = { path?: string; type?: TargetType; ssr?: boolean };
type Entry = {
  source: string | string[];
  target?: string | string[] | TargetDef[];
};

const packageJSON = JSON.parse(readFileSync(`${process.cwd()}/package.json`, 'utf-8'));
const entries = packageJSON['html-encode'] || [];
const args = process.argv;
const type = getTargetTypeFromArgs();
const ssr = args.indexOf('ssr') > -1;

function getTargetTypeFromArgs() {
  if (args.indexOf('ts') > -1) {
    return 'ts';
  } else if (args.indexOf('es') > -1) {
    return 'es.js';
  }

  return 'js';
}
entries.map((entry: Entry) => {
  const targets = standardizeTargets(entry.target || [{ type, ssr }], type, ssr);

  return toArray(entry.source).map((source: string) => {
    return watch(source)
      .on('add', (path) => copy(path, getTargets(targets, path)))
      .on('change', (path) => copy(path, getTargets(targets, path)))
      .on('unlink', (path) => remove(source, path, getTargets(targets, path)))
      .on('addDir', (path) => source !== path && copy(path, getTargets(targets, path)))
      .on('unlinkDir', (path) => remove(source, path, getTargets(targets, path)));
  });
});

function standardizeTargets(targets: string | string[] | TargetDef[], type: TargetType, ssr: boolean): TargetDef[] {
  return toArray(targets).map((target: string | TargetDef) => {
    return typeof target === 'string' ? { path: target, type, ssr } : { type, ssr, ...target };
  });
}

function getTargets(targets: TargetDef[], sourcePath: string) {
  return targets.map((target) => {
    let path = replaceFileExtension(sourcePath, target.type || 'js');
    if (target.path !== undefined) {
      path = isTargetFolder(target.path)
        ? [...target.path.split('/'), path.split('/').pop()].join('/').replace('//', '/')
        : target.path;
    }
    return { path, type: target.type, ssr: target.ssr };
  });
}

// return true if path doesn't end with '/', is an existing folder or last element has no '.' in it
function isTargetFolder(path: string = '') {
  return (
    path.charAt(path.length - 1) === '/' ||
    (existsSync(path) && lstatSync(path).isDirectory()) ||
    (path.split('/') || []).pop()?.indexOf('.') === -1
  );
}

function toArray(element: any) {
  return Array.isArray(element) ? element : [element];
}

function getTargetPath(source: string, file: string, target: string) {
  console.log('\n\ngetTargetPath', source, target);
  return file.replace(source, target);
}

function remove(source: string, file: string, targets: TargetDef[]) {
  targets.forEach((target) =>
    removeFileSync(getTargetPath(source, replaceFileExtension(file, target.type || 'js'), target.path || ''))
  );
}

function copy(file: string, targets: TargetDef[]) {
  targets.forEach((target) => console.log(copyFolderRecursiveSync(file, target)));
}

function replaceFileExtension(filename: string, type: TargetType) {
  return filename.replace(/.[^.]{1,10}$/, `.${type}`);
}

function copyFileSync(source: string, target: TargetDef) {
  let targetFile = target.path;
  if (!targetFile) {
    console.error(`didn't know where to write file`);
    return;
  }

  //if target is a directory a new file with the same name will be created
  if (existsSync(targetFile)) {
    if (lstatSync(targetFile).isDirectory()) {
      targetFile = replaceFileExtension(join(targetFile, basename(source)), target.type || 'js');
    }
  } else {
    targetFile
      .substring(0, targetFile.lastIndexOf('/'))
      .split('/')
      .reduce((memo, folder) => {
        memo += folder;
        verifyFolderExists(memo);
        return `${memo}/`;
      }, '');
  }
  writeFileSync(targetFile, htmlEncoder(readFileSync(source, { encoding: 'utf-8' }), target.type, target.ssr));
}

function verifyFolderExists(folder: string) {
  if (!existsSync(folder)) {
    mkdirSync(folder);
  }
}

function copyFolderRecursiveSync(source: string, target: TargetDef) {
  if (lstatSync(source).isDirectory()) {
    target.path && verifyFolderExists(target.path);

    readdirSync(source).forEach((file) => {
      const curSource = join(source, file);

      if (lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, target);
      } else {
        copyFileSync(curSource, target);
      }
    });
  } else {
    copyFileSync(source, target);
  }

  return `copying ${source} => ${target.path}`;
}

function removeFileSync(path: string) {
  if (existsSync(path)) {
    if (lstatSync(path).isDirectory()) {
      readdirSync(path).forEach((file) => removeFileSync(`${path}/${file}`));
      rmdirSync(path);
    } else {
      unlinkSync(path); // delete file
    }
  }

  return `removing ${path}`;
}
