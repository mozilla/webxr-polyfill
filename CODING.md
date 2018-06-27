# How to code against the WebXR APIs 

Working examples of this type of code can be found in the [examples directory](https://github.com/mozilla/webxr-polyfill/tree/master/examples).

## Session setup

The basic pattern is to iterate through the `XRDevice` instances to find the one that you want to use, based on whether it's external and whether it is a pass-through device. Once you have a device, you ask it for an `XRSession`.

	let devices = null // A list of XRDevice
	let device = null // The device we'll use
	let session = null // The XRSession we'll use
	let canvas = document.createElement('canvas') // The canvas into which we'll render

	// Get devices and then request a session
	navigator.xr.getDevices().then(disps => {
		if(disps.length == 0) {
			// No devices are available
			return
		}
		devices = disps
	}).catch(err => {
		console.error('Error getting XR devices', err)
	})

Once you have the devices, you look for one that will support the type of session that you want to start:

	// Set up the options for the type of session we want 
	let sessionInitOptions = {
		exclusive: false,		// True if you want only this session to have access to the device
		outputContext: new XRPresentationContext(canvas) // Then canvas into which we'll render
	}
	// Now test each device
	for(let disp of devices){
		if(device.supportsSession(sessionInitOptions)){
			device = disp
			break
		}
	}

Once you have a device and the user has chosen to start using it, you ask the device for an `XRSession` and request the first frame:

		device.requestSession(sessionInitParamers).then(sess => {
			session = sess
			session.depthNear = 0.1
			session.depthFar = 1000.0

			session.requestFrame(handleFrame)
		)}

## Per-frame rendering

The scene, camera, and renderer objects below are representative APIs that have equivalents in most WebGL libs like Three.js:

	function handleFrame(frame){
		// Set up for the next frame
		session.requestFrame(frame => { handleFrame(frame) })

		// Get the pose for the head
		let headCoordinateSystem = frame.getCoordinateSystem(XRFrameOfReference.HEAD_MODEL)
		let headPose = frame.getDsiplayPose(frame.getCoordinateSystem(headCoordinateSystem)

		// Devices can have one or more views. A magic window device has one, a headset has two (one for each eye), so iterate through each.
		for(const view of frame.views){

			// Each XRView has its own projection matrix, so set the camera to use that
			camera.projectionMatrix = view.projectionMatrix

			// Rotate the scene around the camera using the head pose
			scene.matrix = headPose.getViewMatrix(view)

			// Set up the renderer to the XRView's viewport and then render
			const viewport = view.getViewport(session.baseLayer)
			renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height)
			renderer.render(scene, camera)
		}
	}
