# How to code against the WebXR APIs 

Working examples of this type of code can be found in the [examples directory](https://github.com/mozilla/webxr-polyfill/tree/master/examples).

## Session setup

The basic pattern is to iterate through the `XRDisplay` instances to find the one that you want to use, based on whether it's external and whether it is a pass-through display. Once you have a display, you ask it for an `XRSession` that is either for rendering a `Reality` or rendering an augmentation on top of a `Reality`.

	let displays = null // A list of XRDisplay
	let display = null // The display we'll use
	let session = null // The XRSession we'll use
	let canvas = document.createElement('canvas') // The canvas into which we'll render
	let anchoredNodes = [] // An array of { anchorOffset: XRAnchorOffset, node: <scene node like THREE.Group> }

	// Get displays and then request a session
	navigator.XR.getDisplays().then(disps => {
		if(disps.length == 0) {
			// No displays are available
			return
		}
		displays = disps
	}).catch(err => {
		console.error('Error getting XR displays', err)
	})

Once you have the displays, you look for one that will support the type of session that you want to start:

	// Set up the options for the type of session we want 
	let sessionInitOptions = {
		exclusive: false,		// True if you want only this session to have access to the display
		type: 'augmentation'	// do you want the session to create a 'reality' or offer an 'augmentation' on an existing `Reality`
		outputContext: new XRPresentationContext(canvas) // Then canvas into which we'll render
	}
	// Now test each display
	for(let disp of displays){
		if(display.supportsSession(sessionInitOptions)){
			display = disp
			break
		}
	}

Once you have a display and the user has chosen to start using it, you ask the display for an `XRSession` and request the first frame:

		display.requestSession(sessionInitParamers).then(sess => {
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
		let headCoordinateSystem = frame.getCoordinateSystem(XRCoordinateSystem.HEAD_MODEL)
		let headPose = frame.getDsiplayPose(frame.getCoordinateSystem(headCoordinateSystem)

		// XXX Below we will add code here to add and manage anchors

		// Displays can have one or more views. A magic window display has one, a headset has two (one for each eye), so iterate through each.
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

## Finding and updating anchors

Anchors are places in space that the AR system is tracking for you. They could be a surface like a floor or table, a feature like a door knob, or just a point in space relative to the world coordinate system. When you place virtual objects in XR, you find an `XRAnchor` to attach it to, possibly with an `XRAnchorOffset` to indicate a position relative to the anchor.

The reason that you use anchors instead of just placing objects in a global coordinate system is that AR systems may change their relative position over time as they sense the world. A table may shift. The system may refine its estimate of the location of the floor or a wall.

First, let's add an anchor just floated in space a meter in front of the current head position.

This code uses the `XRPresentationFrame`, so it would live in the `handleFrame` method above, where the '// XXX' comment is:

			const sceneNode = createSceneNode() // if using Three.js, could be an Object3D or a Group
			let anchorUID = frame.addAnchor(headCoordinateSystem, [0, 0, -1]) 
			scene.add(sceneNode)	// Now the node is in the scene
			// Save this info for update during each frame
			anchoredNodes.push({
				anchorOffset: new XRAnchorOffset(anchor.uid),
				node: sceneNode
			})

Now search for an anchor on a surface like a floor or table:

			frame.findAnchor(x, y).then(anchorOffset => {
				if(anchorOffset === null){
					// no surface was found to place the anchor
					return
				}
				const node = createSceneNode()
				// Add the node to the scene
				scene.add(node)
				// Save this info for update during each frame
				anchoredNodes.push({
					anchorOffset: anchorOffset,
					node: node
				})
			})

You now have a couple of anchored nodes save in `anchoredNodes`, so during each frame use the most recent anchor info to update the node position:

			for(let anchoredNode of anchoredNodes){
				// Get the updated anchor info
				const anchor = frame.getAnchor(anchoredNode.anchorOffset.anchorUID)
				// Get the offset coordinates relative to the anchor's coordinate system
				let offsetTransform = anchoredNode.anchorOffset.getOffsetTransform(anchor.coordinateSystem)
				// Now use the offset transform to position the anchored node in the scene
				anchoredNode.node.matrix = offsetTransform
			}


