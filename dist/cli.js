"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var fs_1 = require("fs");
var chokidar_1 = require("chokidar");
var index_js_1 = require("./index.js");
var packageJSON = JSON.parse(fs_1.readFileSync(process.cwd() + "/package.json", 'utf-8'));
var entries = packageJSON['html-encode'] || [];
var args = process.argv;
var ts = args.indexOf('ts') > -1;
var ssr = args.indexOf('ssr') > -1;
entries.map(function (entry) {
    var targets = standardizeTargets(entry.target || [{ ts: ts, ssr: ssr }], ts, ssr);
    return toArray(entry.source).map(function (source) {
        return chokidar_1.watch(source)
            .on('add', function (path) { return copy(path, getTargets(targets, path)); })
            .on('change', function (path) { return copy(path, getTargets(targets, path)); })
            .on('unlink', function (path) { return remove(source, path, getTargets(targets, path)); })
            .on('addDir', function (path) { return source !== path && copy(path, getTargets(targets, path)); })
            .on('unlinkDir', function (path) { return remove(source, path, getTargets(targets, path)); });
    });
});
function standardizeTargets(targets, ts, ssr) {
    return toArray(targets).map(function (target) {
        return typeof target === 'string' ? { path: target, ts: ts, ssr: ssr } : __assign({ ts: ts, ssr: ssr }, target);
    });
}
function getTargets(targets, sourcePath) {
    return targets.map(function (target) {
        var path = replaceFileExtension(sourcePath, target.ts);
        if (target.path !== undefined) {
            path = isTargetFolder(target.path)
                ? __spreadArrays(target.path.split('/'), [path.split('/').pop()]).join('/').replace('//', '/')
                : target.path;
        }
        return { path: path, ts: target.ts, ssr: target.ssr };
    });
}
// return true if path doesn't end with '/', is an existing folder or last element has no '.' in it
function isTargetFolder(path) {
    return (path.charAt(path.length - 1) === '/' ||
        (fs_1.existsSync(path) && fs_1.lstatSync(path).isDirectory()) ||
        path.split('/').pop().indexOf('.') === -1);
}
function toArray(element) {
    return Array.isArray(element) ? element : [element];
}
function getTargetPath(source, file, target) {
    console.log('\n\ngetTargetPath', source, target);
    return file.replace(source, target);
}
function remove(source, file, targets) {
    targets.forEach(function (target) {
        return removeFileSync(getTargetPath(source, replaceFileExtension(file, target.ts), target.path));
    });
}
function copy(file, targets) {
    targets.forEach(function (target) { return console.log(copyFolderRecursiveSync(file, target)); });
}
function replaceFileExtension(filename, toTypescript) {
    return filename.replace(/.[^.]{1,10}$/, "." + (toTypescript ? 'ts' : 'js'));
}
function copyFileSync(source, target) {
    var targetFile = target.path;
    //if target is a directory a new file with the same name will be created
    if (fs_1.existsSync(targetFile)) {
        if (fs_1.lstatSync(targetFile).isDirectory()) {
            targetFile = replaceFileExtension(path_1.join(targetFile, path_1.basename(source)), target.ts);
        }
    }
    else {
        targetFile
            .substring(0, target.path.lastIndexOf('/'))
            .split('/')
            .reduce(function (memo, folder) {
            memo += folder;
            verifyFolderExists(memo);
            return memo + "/";
        }, '');
    }
    fs_1.writeFileSync(targetFile, index_js_1.default(fs_1.readFileSync(source, { encoding: 'utf-8' }), target.ts, target.ssr));
}
function verifyFolderExists(folder) {
    if (!fs_1.existsSync(folder)) {
        fs_1.mkdirSync(folder);
    }
}
function copyFolderRecursiveSync(source, target) {
    if (fs_1.lstatSync(source).isDirectory()) {
        verifyFolderExists(target.path);
        fs_1.readdirSync(source).forEach(function (file) {
            var curSource = path_1.join(source, file);
            if (fs_1.lstatSync(curSource).isDirectory()) {
                copyFolderRecursiveSync(curSource, target);
            }
            else {
                copyFileSync(curSource, target);
            }
        });
    }
    else {
        copyFileSync(source, target);
    }
    return "copying " + source + " => " + target.path;
}
function removeFileSync(path) {
    if (fs_1.existsSync(path)) {
        if (fs_1.lstatSync(path).isDirectory()) {
            fs_1.readdirSync(path).forEach(function (file) { return removeFileSync(path + "/" + file); });
            fs_1.rmdirSync(path);
        }
        else {
            fs_1.unlinkSync(path); // delete file
        }
    }
    return "removing " + path;
}
