# Changelog

All notable changes to the "html-encoder" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2020-06-14

### Added

- VSCode extension support
- VSCode compatibility tests

### Changed

- Documentation

## [1.0.1] - 2020-06-17

### Added

- Support for ES outputs + test

### Fixed

- support for typescript

## [1.0.2] - 2020-06-18

### Changed

- Updated the icon

### Removed

- CLI Support

### Fixed

- support for typescript (realized `.vscodeignore` prevents packing ts files)
- getNode() now returns Node instead of the obscure JSNode

## [1.0.3] - 2020-06-19

### Fixed

- more fixes for typescript

## [1.0.4] - 2020-06-28

### Added

- Added more test, especially for typescript output

### Fixed

- improved support for loops (empty initial value + switching from arrays and objects)

## [1.0.5] - 2020-08-09

### Fixed

- property.node is now Node (and not Element) to support TextNode
- can now handle using the same conditional more than once
- support for css in loops

### Known Issues

1. ServerSide text condition cannot be removed (as I didn't have where to mark the data-live-if-child)

## [1.0.6] - 2020-11-07

💥 Moved htmlEncoder to a separated project; supporting its latest version 2.0.6