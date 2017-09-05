/*
	XRExampleBase holds all of the common XR setup, rendering, and teardown code for a THREE.js based app
	Extending classes should be able to focus on rendering their scene

	Parameters:
		domElement: an element used to show error messages
		createVirtualReality: if true, create a new empty reality for this app
*/
class XRExampleBase {
	constructor(domElement, createVirtualReality=true){
		this.el = domElement
		this.createVirtualReality = createVirtualReality

		this.hasWebkit = typeof window.webkit !== 'undefined'
		if(this.hasWebkit) this.setupWebkitUI()

		// Set during the XR.getDisplays call below
		this.display = null
		this.session = null

		// Create a simple THREE test scene for the layer
		this.scene = new THREE.Scene() // The scene will be rotated and oriented around the camera using the head pose
		this.stageGroup = new THREE.Group() // The group that stays on the "stage", which is at foot level relative to the head
		this.scene.add(this.stageGroup)
		this.camera = new THREE.PerspectiveCamera(70, 1024, 1024, 1, 1000) // These values will be overwritten by the projection matrix from ARKit or ARCore
		this.renderer = null // Set in this.handleNewSession

		// Give extending classes the opportunity to initially populate the stage group
		this.initializeStageGroup(this.stageGroup)

		if(typeof navigator.XR === 'undefined'){
			this.showMessage('No WebXR API found, usually because the WebXR polyfill has not loaded')
			return
		}

		// Get a display and then request a session
		navigator.XR.getDisplays().then(displays => {
			if(displays.length == 0) {
				this.showMessage('No displays are available')
				return
			}
			this.display = displays[0] // production code would allow the user to choose, this code assumes that this is a FlatDisplay
			this.display.requestSession({
				exclusive: this.createVirtualReality,
				type: this.createVirtualReality ? XRSession.REALITY : XRSession.AUGMENTATION
			}).then(session => {
				this.handleNewSession(session)
			}).catch(err => {
				console.error('Error requesting session', err)
				this.showMessage('Could not initiate the session')
			})
		}).catch(err => {
			console.error('Error getting XR displays', err)
			this.showMessage('Could not get XR displays')
		})
	}

	/*
		Empties this.el, adds a div with the message text, and shows a button to test rendering the scene to this.el
	*/
	showMessage(messageText){
		let message = document.createElement('div')
		message.innerHTML = messageText
		this.el.append(message)
	}

	handleNewSession(session){
		this.session = session
		this.session.depthNear = 0.1
		this.session.depthFar = 1000.0

		// Handle session lifecycle events
		this.session.addEventListener('focus', ev => { this.handleSessionFocus(ev) })
		this.session.addEventListener('blur', ev => { this.handleSessionBlur(ev) })
		this.session.addEventListener('end', ev => { this.handleSessionEnded(ev) })

		// Create a canvas and context for the layer
		let glCanvas = document.createElement('canvas')
		let glContext = glCanvas.getContext('webgl')
		if(glContext === null){
			throw 'Could not create GL context'
		}

		// Set the session's base layer into which the app will render
		this.session.baseLayer = new XRWebGLLayer(this.session, glContext)

		// Handle layer focus events
		this.session.baseLayer.addEventListener('focus', ev => { this.handleLayerFocus(ev) })
		this.session.baseLayer.addEventListener('blur', ev => { this.handleLayerBlur(ev) })

		// Set up the THREE renderer with the session's layer's glContext
		this.renderer = new THREE.WebGLRenderer({
			canvas: glCanvas,
			context: glContext,
			antialias: false,
			alpha: true
		})
		this.renderer.setPixelRatio(1)
		this.renderer.autoClear = false
		this.renderer.setClearColor('#000', 0)

		/*
		This part is a bit bogus and relies on the polyfill only returning a FlatDisplay
		*/
		const width = parseInt(window.getComputedStyle(document.body).width)
		const height = parseInt(window.getComputedStyle(document.body).height)
		this.camera.aspect = width / height
		this.camera.updateProjectionMatrix()
		this.renderer.setSize(width, height)

		if(this.createVirtualReality){
			const reality = this.session.createVirtualReality('VR Example', false)

			// Reqest the Reality change and then set up its XRLayer
			this.session.requestRealityChange(reality).then(() => {
				this.session.requestFrame(frame => { this.handleFrame(frame) })
			}).error(err => {
				console.error('Could not change realities')
			})
		} else {
			// The session's reality defaults to the most recently used shared reality
			this.session.requestFrame(frame => { this.handleFrame(frame) })
		}
	}

	// Extending classes can react to these events
	handleSessionFocus(ev){}
	handleSessionBlur(ev){}
	handleSessionEnded(ev){}
	handleLayerFocus(ev){}
	handleLayerBlur(ev){}

	/*
	Extending classes should override this to set up the stageGroup during class construction
	*/
	initializeStageGroup(){}

	/*
	Extending classes that need to update the layer during each frame should override this method
	*/
	updateStageGroup(frame, stageCoordinateSystem, stagePose){}

	handleFrame(frame){
		const nextFrameRequest = this.session.requestFrame(frame => { this.handleFrame(frame) })
		let stageCoordinateSystem = frame.getCoordinateSystem('stage')
		if(stageCoordinateSystem === null){
			this.showMessage('Could not get a usable stage coordinate system')
			this.session.cancelFrame(nextFrameRequest)
			this.session.endSession()
			// Production apps could render a 'waiting' message and keep checking for an acceptable coordinate system
			return
		}

		// Get the two poses we care about: the foot level stage and head pose which is updated by ARKit, ARCore, or orientation events
		let stagePose = frame.getViewPose(stageCoordinateSystem)
		let headPose = frame.getViewPose(frame.getCoordinateSystem(XRCoordinateSystem.HEAD_MODEL))

		// Let the extending class update the stageGroup before each render
		this.updateStageGroup(frame, stageCoordinateSystem, stagePose)

		// Update the stage group relative to the current head pose
		this.stageGroup.matrixAutoUpdate = false
		this.stageGroup.matrix.fromArray(stagePose.poseModelMatrix)
		this.stageGroup.matrix.elements[12] -= headPose.poseModelMatrix[12]
		this.stageGroup.matrix.elements[13] -= headPose.poseModelMatrix[13]
		this.stageGroup.matrix.elements[14] -= headPose.poseModelMatrix[14]
		this.stageGroup.updateMatrixWorld(true)

		// Prep THREE.js for the render of each XRView
		this.renderer.resetGLState()
		this.scene.matrixAutoUpdate = false
		this.renderer.autoClear = false
		this.renderer.setSize(this.session.baseLayer.framebufferWidth, this.session.baseLayer.framebufferHeight)
		//this.renderer.clear()

		//this.session.baseLayer.context.bindFramebuffer(this.session.baseLayer.context.FRAMEBUFFER, this.session.baseLayer.framebuffer)

		// Render each view into this.session.baseLayer.context
		for(const view of frame.views){
			// Each XRView has its own projection matrix, so set the camera to use that
			this.camera.projectionMatrix.fromArray(view.projectionMatrix)

			// Set the scene's view matrix using the head pose
			this.scene.matrix.fromArray(headPose.getViewMatrix(view))
			this.scene.updateMatrixWorld(true)

			// Set up the renderer to the XRView's viewport and then render
			const viewport = view.getViewport(this.session.baseLayer)
			this.renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height)
			this.renderer.render(this.scene, this.camera)
		}
	}

	/*
	A temporary UI to show on the iOS app until the app itself provides a URL bar
	*/
	setupWebkitUI(){
		this.webkitControlEl = document.createElement('div')
		this.el.appendChild(this.webkitControlEl)
		this.webkitControlEl.setAttribute('class', 'webkit-control')
		this.locationInput = document.createElement('input')
		this.locationInput.style.width = '50%'
		this.locationInput.value = '' + document.location.href
		this.webkitControlEl.appendChild(this.locationInput)
		this.locationButton = document.createElement('button')
		this.locationButton.innerHTML = 'load'
		this.webkitControlEl.appendChild(this.locationButton)

		this.locationButton.addEventListener('click', ev => {
			window.webkit.messageHandlers.loadUrl.postMessage({
	            url: this.locationInput.value
	        })
		})
	}
}

function fillInGLTFScene(path, scene, position=[0, 0, -2], scale=[1, 1, 1]){
	let ambientLight = new THREE.AmbientLight('#FFF', 1)
	scene.add(ambientLight)

	let directionalLight = new THREE.DirectionalLight('#FFF', 0.6)
	scene.add(directionalLight)

	loadGLTF(path).then(gltf => {
		gltf.scene.scale.set(...scale)
		gltf.scene.position.set(...position)
		//gltf.scene.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / -2)
		scene.add(gltf.scene)
	}).catch((...params) =>{
		console.error('could not load gltf', ...params)
	})
}

function fillInBoxScene(scene){
	let geometry = new THREE.BoxBufferGeometry(0.2, 0.2, 0.2)
	let material = new THREE.MeshPhongMaterial({ color: '#DDFFDD' })
	let mesh = new THREE.Mesh(geometry, material)
	mesh.position.set(0, 0, -0.8)
	scene.add(mesh)

	let ambientLight = new THREE.AmbientLight('#FFF', 1)
	scene.add(ambientLight)

	let directionalLight = new THREE.DirectionalLight('#FFF', 0.6)
	scene.add(directionalLight)

	return scene
}

function loadGLTF(url){
	return new Promise((resolve, reject) => {
		let loader = new THREE.GLTFLoader()
		loader.load(url, (gltf) => {
			if(gltf === null){
				reject()
			}
			if(gltf.animations && gltf.animations.length){
				let mixer = new THREE.AnimationMixer(gltf.scene)
				for(let animation of gltf.animations){
					mixer.clipAction(animation).play()
				}
			}
			resolve(gltf)
		})
	})
}

function loadObj(baseURL, geometry){
	return new Promise(function(resolve, reject){
		const mtlLoader = new THREE.MTLLoader()
		mtlLoader.setPath(baseURL)
		const mtlName = geometry.split('.')[geometry.split(':').length - 1] + '.mtl'
		mtlLoader.load(mtlName, (materials) => {
			materials.preload()
			let objLoader = new THREE.OBJLoader()
			objLoader.setMaterials(materials)
			objLoader.setPath(baseURL)
			objLoader.load(geometry, (obj) => {
				resolve(obj)
			}, () => {} , (...params) => {
				console.error('Failed to load obj', ...params)
				reject(...params)
			})
		})
	})
}

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
