/*
	XRExampleBase holds all of the common XR setup, rendering, and teardown code for a THREE.js based app

	Extending classes should be able to focus mainly on rendering their scene and handling user input

	Parameters:
		domElement: an element used to show error messages

	XRDevices require that the call to requestPresent be a direct result of an input event like a click.
	You'll need to call this.startPresenting() inside an input event handler.

*/
class XRExampleBase {
	constructor(domElement){
		this.el = domElement
		this.shouldStartPresenting = shouldStartPresenting

		this._boundHandleFrame = this._handleFrame.bind(this) // Useful for setting up the requestAnimationFrame callback

		// Set during the XR.getDevices call below
		this.devices = null

		// Set during this.startSession below		
		this.device = null
		this.session = null

		this.scene = new THREE.Scene() // The scene will be rotated and oriented around the camera using the head pose

		this.camera = new THREE.PerspectiveCamera(70, 1024, 1024, 0.1, 1000) // These values will be overwritten by the projection matrix from ARKit or ARCore
		this.scene.add(this.camera)

		// Create a canvas and context for the session layer
		this.glCanvas = document.createElement('canvas')
		this.glContext = this.glCanvas.getContext('webgl')
		if(this.glContext === null){
			this.showMessage('Could not create a WebGL canvas')
			throw new Error('Could not create GL context')
		}

		// Set up the THREE renderer with the session's layer's glContext
		this.renderer = new THREE.WebGLRenderer({
			canvas: this.glCanvas,
			context: this.glContext,
			antialias: false,
			alpha: true
		})
		this.renderer.setPixelRatio(1)
		this.renderer.autoClear = false
		this.renderer.setClearColor('#000', 0)

		// Give extending classes the opportunity to initially populate the scene
		this.initializeScene()

		if(typeof navigator.xr === 'undefined'){
			this.showMessage('No WebXR API found, usually because the WebXR polyfill has not loaded')
			return
		}

		navigator.xr.getDevices().then(devices => {
			if(devices.length == 0) {
				this.showMessage('No devices are available')
				return
			}
			this.devices = devices
			this._setupSession()
		}).catch(err => {
			console.error('Error getting XR devices', err)
			this.showMessage('Could not get XR devices')
		})
	}

	/*
	Call startPresenting() inside an input event handler.
	*/
	startPresenting(){
		if(this.session === null){
			console.error('Could not start presenting with null session')
			return
		}
		this.session.baseLayer.addEventListener('focus', ev => { this.handleLayerFocus(ev) })
		this.session.baseLayer.addEventListener('blur', ev => { this.handleLayerBlur(ev) })
		this.session.requestFrame(this._boundHandleFrame)
	}

	_setupSession(){
		let sessionInitParamers = {
			exclusive: true,
			outputContext: new XRPresentationContext(this.glCanvas)
		}
		for(let device of this.devices){
			if(device.supportsSession(sessionInitParamers)){
				this.device = device
				break
			}
		}
		if(this.device === null){
			this.showMessage('Could not find a device for this type of session')
			return
		}
		this.device.requestSession(sessionInitParamers).then(session => {
			this.session = session
			this.session.depthNear = 0.1
			this.session.depthFar = 1000.0

			// Handle session lifecycle events
			this.session.addEventListener('focus', ev => { this.handleSessionFocus(ev) })
			this.session.addEventListener('blur', ev => { this.handleSessionBlur(ev) })
			this.session.addEventListener('end', ev => { this.handleSessionEnded(ev) })

			this.session.requestFrameOfReference(XRFrameOfReference.HEAD_MODEL).then(coordinateSystem => {
				this._headCoordinateSystem = coordinateSystem
			}).catch(() => {
				console.error('Could not get a head pose')
				this.session.end()
				this.session = null
			})
		}).catch(err => {
			console.error('Error requesting session', err)
			this.showMessage('Could not initiate the session')
		})
	}

	/*
		Empties this.el, adds a div with the message text
	*/
	showMessage(messageText){
		let messages = document.getElementsByClassName('common-message')
		if(messages.length > 0){
			var message = messages[0]
		} else {
			var message = document.createElement('div')
			message.setAttribute('class', 'common-message')
			this.el.append(message)
		}
		let div = document.createElement('div')
		div.innerHTML = messageText
		message.appendChild(div)
	}

	// Extending classes can react to these events
	handleSessionFocus(ev){}
	handleSessionBlur(ev){}
	handleSessionEnded(ev){}
	handleLayerFocus(ev){}
	handleLayerBlur(ev){}

	/*
	Extending classes should override this to set up the scene during class construction
	*/
	initializeScene(){}

	/*
	Extending classes that need to update the layer during each frame should override this method
	*/
	updateScene(frame, headCoordinateSystem){}

	_handleFrame(frame){
		const nextFrameRequest = this.session.requestFrame(this._boundHandleFrame)

		// Let the extending class update the scene before each render
		this.updateScene(frame, this._headCoordinateSystem)

		// Prep THREE.js for the render of each XRView
		this.renderer.autoClear = false
		this.renderer.setSize(this.session.baseLayer.framebufferWidth, this.session.baseLayer.framebufferHeight, false)
		this.renderer.clear()
		this.camera.matrixAutoUpdate = false

		const headPose = frame.getDevicePose(this._headCoordinateSystem)

		// Render each view into this.session.baseLayer.context
		for(const view of frame.views){
			// Each XRView has its own projection matrix, so set the camera to use that
			this.camera.projectionMatrix.fromArray(view.projectionMatrix)
			this.camera.matrix.fromArray(headPose.poseModelMatrix)
			this.camera.updateMatrixWorld(true)

			// Set up the renderer to the XRView's viewport and then render
			this.renderer.clearDepth()
			const viewport = view.getViewport(this.session.baseLayer)
			this.renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height)
			this.doRender()
		}
	}

	doRender(){
		this.renderer.render(this.scene, this.camera)
	}
}

/*
If you want to just put virtual things on surfaces, extend this app and override `createSceneGraphNode`
*/
class ThingsOnSurfacesApp extends XRExampleBase {
	constructor(domElement){
		super(domElement, false)
	}

	// Return a THREE.Object3D of some sort to be placed when a surface is found
	createSceneGraphNode(){
		throw new Error('Extending classes should implement createSceneGraphNode')
		/*
		For example:
		let geometry = new THREE.BoxBufferGeometry(0.1, 0.1, 0.1)
		let material = new THREE.MeshPhongMaterial({ color: '#99FF99' })
		return new THREE.Mesh(geometry, material)
		*/
	}


	// Called once per frame, before render, to give the app a chance to update this.scene
	updateScene(frame, headCoordinateSystem){
	}
}

THIS IS WHERE IS STOPPED. I JUST REWHACKED SESSION SETUP FOR VR, SO GIVE IT A TRY.


/*
Rate limit a function call. Wait is the minimum number of milliseconds between calls.
If leading is true, the first call to the throttled function is immediately called.
If trailing is true, once the wait time has passed the function is called. 

This code is cribbed from https://github.com/jashkenas/underscore
*/
window.throttle = function(func, wait, leading=true, trailing=true) {
	var timeout, context, args, result
	var previous = 0

	var later = function() {
		previous = leading === false ? 0 : Date.now()
		timeout = null
		result = func.apply(context, args)
		if (!timeout) context = args = null
	}

	var throttled = function() {
		var now = Date.now()
		if (!previous && leading === false) previous = now
		var remaining = wait - (now - previous)
		context = this
		args = arguments
		if (remaining <= 0 || remaining > wait) {
		if (timeout) {
			clearTimeout(timeout)
			timeout = null
		}
		previous = now
		result = func.apply(context, args)
		if (!timeout) context = args = null
		} else if (!timeout && trailing !== false) {
		timeout = setTimeout(later, remaining)
		}
		return result
	}

	throttled.cancel = function() {
		clearTimeout(timeout)
		previous = 0
		timeout = context = args = null
	}

	return throttled
}

window.throttledConsoleLog = throttle((...params) => {
	console.log(...params)
}, 1000)

function hideMe(elem) { elem.style.device = 'none' }
