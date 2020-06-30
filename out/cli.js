"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encode = void 0;
const fs_1 = require("fs");
const chokidar_1 = require("chokidar");
const glob_1 = require("glob");
const htmlEncoder_1 = require("./htmlEncoder");
const findTargets_1 = require("./findTargets");
if (require.main === module) {
    // this module was run directly from the command line as in node xxx.js
    const args = process.argv.slice(2);
    const entries = args.filter(arg => ['-w', '-watch'].indexOf(arg) === -1);
    encode(entries, entries.length !== args.length).catch(err => console.error(err.message));
}
function glob(query) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => new glob_1.Glob(query, (er, files) => er ? reject(er) : resolve(files)));
    });
}
function encode(entries = [], isWatch = false) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!entries.length) {
            return new Promise((r, reject) => reject(new Error('no source files provided')));
        }
        const watchers = [];
        yield Promise.all((toArray(entries))
            .map((entry) => __awaiter(this, void 0, void 0, function* () {
            return (yield glob(entry)).map((file) => isWatch ? watchers.push(addWatch(file)) : encodeFile(file));
        })));
        return watchers;
    });
}
exports.encode = encode;
function addWatch(entry) {
    return chokidar_1.watch(entry)
        .on('add', encodeFile)
        .on('change', encodeFile);
}
function encodeFile(path) {
    if (!fs_1.existsSync(path)) {
        console.error(`file not exists: ${path}`);
    }
    else if (path.match(/\.template\.html$/)) {
        const text = fs_1.readFileSync(path, { encoding: 'utf-8' });
        findTargets_1.default(path, text).forEach((target) => copyFileSync(text, target));
    }
    return false;
}
function copyFileSync(text, target) {
    let targetFile = target.path;
    let accPath = [];
    targetFile
        .substring(0, target.path.lastIndexOf('/'))
        .split('/')
        .forEach((folder) => {
        accPath.push(folder);
        if (accPath.length >= 1 && accPath[0].length) {
            verifyFolderExists(accPath.join('/'));
        }
    });
    fs_1.writeFileSync(targetFile, htmlEncoder_1.default(text.replace(findTargets_1.allTargetsPattern, ''), target.type, target.ssr));
}
function verifyFolderExists(folder) {
    if (!fs_1.existsSync(folder)) {
        fs_1.mkdirSync(folder);
    }
}
function toArray(element) {
    return Array.isArray(element) ? element : [element];
}
//# sourceMappingURL=cli.js.map