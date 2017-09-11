# WebXR polyfill with examples

This repository holds a polyfill and example applications for a proposed API for building AR and VR applications in web browsers.

You can find the proposed API description in the [webxr-api repository](https://github.com/mozilla/webxr-api).

## WARNING

THIS SOFTWARE IS PRERELEASE, IS *NOT* READY FOR PRODUCTION USE, AND *WILL* SOON HAVE BREAKING CHANGES.

NOTHING IN THIS REPO COMES WITH ANY WARRENTY WHATSOEVER. DO NOT USE IT FOR ANYTHING EXCEPT EXPERIMENTS.

There are a lot of pieces of the WebXR polyfill that are stubbed out and throw 'Not implemented' when called. The paths that are used by the examples are filled in, but things like cartographic coordinates and geospatial coordinate systems are not yet implemented.

## Running the examples

Clone this repo and then change directories into webxr-polyfill/

<a href="https://docs.npmjs.com/getting-started/installing-node">Install npm</a> and then run the following:

	npm install   # downloads webpack and an http server
	npm start     # builds the polyfill in dist/webxr-polyfill.js and start the http server in the current directory

## Builds

  npm run build # builds the polyfill in dist/webxr-polyfill.js

Using one of the supported browsers listed below, go to http://YOUR_HOST_NAME:8080/

## Writing your own XR apps

The WebXR polyfill is not dependent on any external libraries, but examples/common.js has a handy base class, XRExampleBase, that wraps all of the boilerplate of starting a WebXR session and rendering into a WebGL layer using Three.js.

Look in examples/ar_simplest/index.html for an example of how to extend XRExampleBase and how to start up an app.

If you run these apps on our ARKit iOS app then they will use the class in polyfill/platform/ARKitWrapper.js to get pose and anchor data out of ARKit.

If you run these apps on Google's ARCore backed browser then they will use the class in polyfill/platform/ARCoreCameraRenderer.js to use data out of ARCore.

If you run these apps on desktop Firefox or Chrome with a WebVR 1.1 supported VR headset, the headset will be exposed as a WebXR XRDisplay.

If you run these apps on a device with no VR or AR tracking, the apps will use the 3dof orientation provided by Javascript orientation events.
 
## Supported Displays

- Flat Display (AR only, needs VR)
- WebVR 1.1 HMD (VR only, needs AR)
- Cardboard (NOT YET)
- Hololens (NOT YET)

## Supported Realities

- Camera Reality (ARKit on Mozilla iOS Test App, ARCore on Android Chrome, ARCore on Android iOS (NOT YET), WebRTC video stream (PARTIAL))
- Virtual Reality
- Passthrough Reality (NOT YET)

## Supported Browsers

- Mozilla iOS AR Test App
- Google ARCore Test Chrome on Android
- Google ARCore Test Chrome on iOS (NOT YET)
- Desktop Firefox with WebVR 1.1 HMDs
- Mobile Safari, Chrome, and Firefox (PARTIAL, Daydream NOT TESTED)
- GearVR Internet (NOT TESTED)
