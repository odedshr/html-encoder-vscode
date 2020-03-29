"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var fs_1 = require("fs");
var chokidar_1 = require("chokidar");
var index_js_1 = require("./index.js");
var packageJSON = JSON.parse(fs_1.readFileSync(process.cwd() + "/package.json", 'utf-8'));
var entries = packageJSON['html-encode'] || [];
var toTypescript = packageJSON['html-encode-to-ts'] === 'true';
entries.map(function (entry) {
    var targets = entry.target ? toArray(entry.target) : false;
    return toArray(entry.source).map(function (source) {
        return chokidar_1.watch(source)
            .on('add', function (path) { return copy(source, path, targets || [replaceFileExtension(path, toTypescript)], toTypescript); })
            .on('change', function (path) { return copy(source, path, targets || [replaceFileExtension(path, toTypescript)], toTypescript); })
            .on('unlink', function (path) { return remove(source, path, targets || [replaceFileExtension(path, toTypescript)]); })
            .on('addDir', function (path) {
            return source !== path && copy(source, path, targets || [replaceFileExtension(path, toTypescript)], toTypescript);
        })
            .on('unlinkDir', function (path) { return remove(source, path, targets || [replaceFileExtension(path, toTypescript)]); });
    });
});
function toArray(element) {
    return Array.isArray(element) ? element : [element];
}
function getTargetPath(source, file, target) {
    return file.replace(source, target);
}
function remove(source, file, targets) {
    targets.forEach(function (target) { return removeFileSync(getTargetPath(source, replaceFileExtension(file, toTypescript), target)); });
}
function copy(source, file, targets, toTypescript) {
    targets.forEach(function (target) {
        return console.log(copyFolderRecursiveSync(file, getTargetPath(source, replaceFileExtension(file, toTypescript), target), toTypescript));
    });
}
function replaceFileExtension(filename, toTypescript) {
    return filename.replace(/.[^.]{1,10}$/, "." + (toTypescript ? 'ts' : 'js'));
}
function copyFileSync(source, target, toTypescript) {
    var targetFile = target;
    //if target is a directory a new file with the same name will be created
    if (fs_1.existsSync(target)) {
        if (fs_1.lstatSync(target).isDirectory()) {
            targetFile = replaceFileExtension(path_1.join(target, path_1.basename(source)), toTypescript);
        }
    }
    else {
        target
            .substring(0, target.lastIndexOf('/'))
            .split('/')
            .reduce(function (memo, folder) {
            memo += folder;
            verifyFolderExists(memo);
            return memo + "/";
        }, '');
    }
    fs_1.writeFileSync(targetFile, index_js_1.default(fs_1.readFileSync(source, { encoding: 'utf-8' }), toTypescript));
}
function verifyFolderExists(folder) {
    if (!fs_1.existsSync(folder)) {
        fs_1.mkdirSync(folder);
    }
}
function copyFolderRecursiveSync(source, target, toTypescript) {
    if (fs_1.lstatSync(source).isDirectory()) {
        verifyFolderExists(target);
        fs_1.readdirSync(source).forEach(function (file) {
            var curSource = path_1.join(source, file);
            if (fs_1.lstatSync(curSource).isDirectory()) {
                copyFolderRecursiveSync(curSource, target, toTypescript);
            }
            else {
                copyFileSync(curSource, target, toTypescript);
            }
        });
    }
    else {
        copyFileSync(source, target, toTypescript);
    }
    return "copying " + source + " => " + target;
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
