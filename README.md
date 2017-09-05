# WebXR examples

This repository holds example applications that use a proposed API for building AR and VR applications in web browsers.

You can find the proposed API description in the [webxr-api repository](https://github.com/mozilla/webxr-api).

## WARNING

THIS SOFTWARE IS PRERELEASE, IS *NOT* READY FOR PRODUCTION USE, AND *WILL* SOON HAVE BREAKING CHANGES.

NOTHING IN THIS REPO COMES WITH ANY WARRENTY WHATSOEVER. DO NOT USE IT FOR ANYTHING EXCEPT EXPERIMENTS.

There are a lot of pieces of the WebXR polyfill that are stubbed out and throw 'Not implemented' when called. The paths that are used by the example apps are filled in, but things like cartographic coordinates and geospatial coordinate systems are not yet implemented.

## Running the examples

Clone this repo and then change directories into webxr-examples/

<a href="https://docs.npmjs.com/getting-started/installing-node">Install npm</a> and then run the following:

	npm install   # downloads webpack and an http server
	npm run build # creates dist/webxr-polyfill.js for browsers that can't load ES modules
	npm run start # start the http server in the current directory

Then go to http://127.0.0.1:8080/ to see index.html.

## Writing your own XR apps

Look in ar_simplest_example.html for an example of what scripts to load and how to start up an app.

common_examples.js has a nice base class, XRExampleBase, that wraps all of the boilerplate of starting a WebXR session and rendering into a WebGL layer.

ar_examples.js and vr_examples.js contains example application classes that extend XRExampleBase.

If you run these apps on our ARKit iOS app then they will use the class in polyfill/platform/ARKitWrapper.js to get pose and anchor data out of ARKit.

If you run these apps on Google's ARCore backed browser then they will use the class in polyfill/platform/ARCoreCameraRenderer.js to use data out of ARCore.

If you run these apps on a device with no VR or AR tracking, the apps will use the 3dof orientation provided by Javascript orientation events.
 
