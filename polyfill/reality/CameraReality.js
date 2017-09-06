import Reality from '../Reality.js'
import ARKitWrapper from '../platform/ARKitWrapper.js'
import ARCoreCameraRenderer from '../platform/ARCoreCameraRenderer.js'

/*
CameraReality displays the forward facing camera.

If this is running in the iOS ARKit wrapper app, the camera data will be displayed in a Metal layer below the WKWebKit layer.
If this is running in the Google ARCore Chrome application, it will create a canvas element and use the ARCore provided camera data.
If there is no ARKit or ARCore available, it will use WebRTC's MediaStream to render camera data into a canvas.
*/
export default class CameraReality extends Reality {
	constructor(xr){
		super(xr, 'Camera', true, true)

		this._initialized = false
		this._running = false

		// These are used if we have access to ARKit
		this._arKitWrapper = null

		// These are used if we do not have access to ARKit
		this._mediaStream = null
		this._videoEl = null

		// These are used if we're using the Google ARCore web app
		this._arCoreCameraRenderer = null
		this._arCoreCanvas = null
		this._elContext = null
		this._vrDisplay = null
		this._vrFrameData = null

		// Try to find a WebVR 1.1 display that supports Google's ARCore extensions
		if(typeof navigator.getVRDisplays === 'function'){
			navigator.getVRDisplays().then(displays => {
				for(let display of displays){
					if(display === null) continue
					if(display.capabilities.hasPassThroughCamera){ // This is the ARCore extension to WebVR 1.1
						this._vrDisplay = display
						this._vrFrameData = new VRFrameData()
						this._arCoreCanvas = document.createElement('canvas')
						this._xr._realityEls.appendChild(this._arCoreCanvas)
						this._arCoreCanvas.width = window.innerWidth
						this._arCoreCanvas.height = window.innerHeight
						this._elContext = this._arCoreCanvas.getContext('webgl')
						if(this._elContext === null){
							throw 'Could not create CameraReality GL context'
						}
						window.addEventListener('resize', () => {
							this._arCoreCanvas.width = window.innerWidth
							this._arCoreCanvas.height = window.innerHeight
						}, false)
						break
					}
				}
			})
		}
	}

	/*
	Called by a session before it hands a new XRPresentationFrame to the app
	*/
	_handleNewFrame(frame){
		if(this._arCoreCameraRenderer){
			this._arCoreCameraRenderer.render()
			this._vrDisplay.getFrameData(this._vrFrameData)
		}

		// TODO update the anchor positions using ARCore or ARKit
	}

	_start(){
		if(this._running) return
		this._running = true

		if(this._vrDisplay !== null){ // Using ARCore
			this._arCoreCameraRenderer = new ARCoreCameraRenderer(this._vrDisplay, this._elContext)
			this._initialized = true
		} else if(ARKitWrapper.HasARKit()){ // Using ARKit
			if(this._initialized === false){
				this._initialized = true
				this._arKitWrapper = ARKitWrapper.GetOrCreate()
				this._arKitWrapper.addEventListener(ARKitWrapper.ADD_OBJECT_NAME, this._handleARKitAddObject.bind(this))
				this._arKitWrapper.waitForInit().then(() => {
					this._arKitWrapper.watch()
				})
			} else {
				this._arKitWrapper.watch()
			}
		} else { // Using WebRTC
			if(this._initialized === false){
				this._initialized = true
				navigator.mediaDevices.getUserMedia({
					audio: false,
					video: { facingMode: "environment" }
				}).then(stream => {
					this._videoEl = document.createElement('video')
					this._xr._realityEls.appendChild(this._videoEl)
					this._videoEl.setAttribute('class', 'camera-reality-video')
                    this._videoEl.setAttribute('playsinline', true);
					this._videoEl.style.width = '100%'
					this._videoEl.style.height = '100%'
					this._videoEl.srcObject = stream
					this._videoEl.play()
				}).catch(err => {
					console.error('Could not set up video stream', err)
					this._initialized = false
					this._running = false
				})
			} else {
				this._videoEl.play()
			}
		}
	}

	_stop(){
		if(ARKitWrapper.HasARKit()){
			if(this._arKitWrapper === null){
				return
			}
			this._arKitWrapper.stop()
		} else if(this._videoEl !== null){
			this._videoEl.pause()
		}
	}

	_handleARKitAddObject(ev){
		console.log('AR add object', ev)
	}

	_addAnchor(anchor){
		console.log('reality adding anchor', anchor)

		// TODO talk to ARKit or ARCore to create an anchor

		this._anchors.set(anchor.uid, anchor)
		return anchor.uid
	}

	/*
	Creates an anchor attached to a surface, as found by a ray
	*/
	_findAnchor(coordinates){
		// XRAnchorOffset? findAnchor(XRCoordinates); // cast a ray to find or create an anchor at the first intersection in the Reality
		// TODO talk to ARKit to create an anchor
		throw 'Need to implement in CameraReality'
	}

	_removeAnchor(uid){
		// returns void
		// TODO talk to ARKit to delete an anchor
		this._anchors.delete(uid)
	}
}
