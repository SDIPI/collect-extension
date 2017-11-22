# wdf-extension

**wdf-extension** is the client browser extension part of the "Web Digital Footprints and Data Privacy" project from [SDIPI](https://sdipi.ch).

## Prerequisites

This project has no prerequisite to build. To run it, you'll need a version of the Chrome browser that can install and execute extensions written in ES 6 (from Chrome 49).

## Installing

To install the extension on your browser, simply drag and drop the `src` folder into the [Extensions page of Google Chrome](chrome://extensions/).

## Deployment

If you're looking to package the extension for the Chrome Store, either compress the content of the `src` directory in .zip format yourself, or if you have npm installed, run the following in the project's root directory :
```js
npm install
npm run build
```