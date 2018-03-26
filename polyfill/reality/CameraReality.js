import Reality from '../Reality.js'
import XRAnchor from '../XRAnchor.js'
import XRViewPose from '../XRViewPose.js'

import XRAnchorOffset from '../XRAnchorOffset.js'

import XRLightEstimate from '../XRLightEstimate.js'

import MatrixMath from '../fill/MatrixMath.js'
import Quaternion from '../fill/Quaternion.js'

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

		this._lightEstimate = new XRLightEstimate();

		// Try to find a WebVR 1.1 display that supports Google's ARCore extensions
		if(typeof navigator.getVRDisplays === 'function'){
			navigator.getVRDisplays().then(displays => {
				for(let display of displays){
					if(display === null) continue
					if(display.capabilities.hasPassThroughCamera){ // This is the ARCore extension to WebVR 1.1
						this._vrDisplay = display
						this._vrFrameData = new VRFrameData()
						if (!window.WebARonARKitSetData) {							
							this._arCoreCanvas = document.createElement('canvas')
							this._xr._realityEls.appendChild(this._arCoreCanvas)
							this._arCoreCanvas.width = window.innerWidth
							this._arCoreCanvas.height = window.innerHeight
							this._elContext = this._arCoreCanvas.getContext('webgl')
							if(this._elContext === null){
								throw 'Could not create CameraReality GL context'
							}
						}
						break
					}
				}
			})
		}

		window.addEventListener('resize', () => {
			if(this._arCoreCanvas){
				this._arCoreCanvas.width = window.innerWidth
				this._arCoreCanvas.height = window.innerHeight
			}
		}, false)
	}

	/*
	Called by a session before it hands a new XRPresentationFrame to the app
	*/
	_handleNewFrame(frame){
		if(this._vrDisplay){
			if (this._arCoreCameraRenderer) {
				this._arCoreCameraRenderer.render()
			}
			this._vrDisplay.getFrameData(this._vrFrameData)
		}

		// TODO update the anchor positions using ARCore or ARKit
	}

	_start(parameters=null){
		if(this._running) return
		this._running = true

		if(this._vrDisplay !== null){ // Using WebAR
			if (window.WebARonARKitSetData) {
				// WebARonARKit renders camera separately
			} else {
				this._arCoreCameraRenderer = new ARCoreCameraRenderer(this._vrDisplay, this._elContext)
			}
			this._initialized = true
		} else if(ARKitWrapper.HasARKit()){ // Using ARKit
			if(this._initialized === false){
				this._initialized = true
				this._arKitWrapper = ARKitWrapper.GetOrCreate()
				this._arKitWrapper.addEventListener(ARKitWrapper.WATCH_EVENT, this._handleARKitWatch.bind(this))
				this._arKitWrapper.waitForInit().then(() => {
					this._arKitWrapper.watch(parameters)
				})
			} else {
				this._arKitWrapper.watch(parameters)
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
				this._xr._realityEls.appendChild(this._videoEl)
				this._videoEl.play()
			}
		}
	}

	_stop(){
		if(this._running === false) return
		this._running = false
		if(ARKitWrapper.HasARKit()){
			if(this._arKitWrapper === null){
				return
			}
			this._arKitWrapper.stop()
		} else if(this._arCoreCanvas){
			this._xr._realityEls.removeChild(this._arCoreCanvas)
			this._arCoreCanvas = null
		} else if(this._videoEl !== null){
			this._videoEl.pause()
			this._xr._realityEls.removeChild(this._videoEl)
		}
	}

	_handleARKitWatch(ev){
		if(ev.detail && ev.detail.objects){
			for(let anchorInfo of ev.detail.objects){
				this._updateAnchorFromARKitUpdate(anchorInfo.uuid, anchorInfo)
			}
		}
		if (ev.detail && ev.detail.removedObjects) {
			for (let removedAnchor of ev.detail.removedObjects) {
				this._deleteAnchorFromARKitUpdate(removedAnchor)
			}
		}
	}

    _deleteAnchorFromARKitUpdate(anchorUUID) {
        this._anchors.delete(anchorUUID)
	}

	_handleARKitAddObject(anchorInfo){
		this._updateAnchorFromARKitUpdate(anchorInfo.uuid, anchorInfo)
	}

	_updateAnchorFromARKitUpdate(uid, anchorInfo){
		const anchor = this._anchors.get(uid) || null
		if(anchor === null){
			// console.log('unknown anchor', anchor)
			return
		}
		// This assumes that the anchor's coordinates are in the tracker coordinate system
		anchor.coordinateSystem._relativeMatrix = anchorInfo.transform
	}

	_addAnchor(anchor, display){
		// Convert coordinates to the tracker coordinate system so that updating from ARKit transforms is simple
		if(this._arKitWrapper !== null){
			this._arKitWrapper.addAnchor(anchor.uid, anchor.coordinateSystem._poseModelMatrix).then(
				detail => this._handleARKitAddObject(detail)
			)
		}
		// ARCore as implemented in the browser does not offer anchors except on a surface, so we just use untracked anchors
		this._anchors.set(anchor.uid, anchor)
		return anchor.uid
	}

	/*
	Creates an anchor offset relative to a surface, as found by a ray
	normalized screen x and y are in range 0..1, with 0,0 at top left and 1,1 at bottom right
	returns a Promise that resolves either to an AnchorOffset with the first hit result or null if the hit test failed
	*/
	_findAnchor(normalizedScreenX, normalizedScreenY, display){
		return new Promise((resolve, reject) => {
			if(this._arKitWrapper !== null){	
				// Perform a hit test using the ARKit integration
				this._arKitWrapper.hitTest(normalizedScreenX, normalizedScreenY, ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANES).then(hits => {
					if(hits.length === 0){
						resolve(null)
						// console.log('miss')
						return
					}
					const hit = this._pickARKitHit(hits)
					hit.anchor_transform[13] += XRViewPose.SITTING_EYE_HEIGHT
					hit.world_transform[13] += XRViewPose.SITTING_EYE_HEIGHT

					// Use the first hit to create an XRAnchorOffset, creating the XRAnchor as necessary

					// TODO use XRPlaneAnchor for anchors with extents

					let anchor = this._getAnchor(hit.uuid)
					if(anchor === null){
						let coordinateSystem = new XRCoordinateSystem(display, XRCoordinateSystem.TRACKER)
						coordinateSystem._relativeMatrix = hit.anchor_transform
						anchor = new XRAnchor(coordinateSystem, hit.uuid)
						this._anchors.set(anchor.uid, anchor)
					}

					const offsetPosition = [
						hit.world_transform[12] - hit.anchor_transform[12],
						hit.world_transform[13] - hit.anchor_transform[13],
						hit.world_transform[14] - hit.anchor_transform[14]
					]
					const worldRotation = new Quaternion().setFromRotationMatrix(hit.world_transform)
					const inverseAnchorRotation = new Quaternion().setFromRotationMatrix(hit.anchor_transform).inverse()
					const offsetRotation = new Quaternion().multiplyQuaternions(worldRotation, inverseAnchorRotation)
					const anchorOffset = new XRAnchorOffset(anchor.uid)
					anchorOffset.poseMatrix = MatrixMath.mat4_fromRotationTranslation(new Float32Array(16), offsetRotation.toArray(), offsetPosition)
					resolve(anchorOffset)
				})
			} else if(this._vrDisplay !== null){
				// Perform a hit test using the ARCore data
				let hits = this._vrDisplay.hitTest(normalizedScreenX, normalizedScreenY)
				if(hits.length == 0){
					resolve(null)
					return
				}
				hits.sort((a, b) => a.distance - b.distance)
				let anchor = this._getAnchor(hits[0].uuid)
				if(anchor === null){
					let coordinateSystem = new XRCoordinateSystem(display, XRCoordinateSystem.TRACKER)
					coordinateSystem._relativeMatrix = hits[0].modelMatrix
					coordinateSystem._relativeMatrix[13] += XRViewPose.SITTING_EYE_HEIGHT
					anchor = new XRAnchor(coordinateSystem)
					this._anchors.set(anchor.uid, anchor)
				}
				resolve(new XRAnchorOffset(anchor.uid))
			} else {
				resolve(null) // No platform support for finding anchors
			}
		})
	}

	_removeAnchor(uid){
		ARKitWrapper.removeAnchor(uid)
	}

	_pickARKitHit(data){
		if(data.length === 0) return null
		let info = null

		let planeResults = data.filter(
			hitTestResult => hitTestResult.type != ARKitWrapper.HIT_TEST_TYPE_FEATURE_POINT
		)
		let planeExistingUsingExtentResults = planeResults.filter(
			hitTestResult => hitTestResult.type == ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_EXTENT
		)
		let planeExistingResults = planeResults.filter(
			hitTestResult => hitTestResult.type == ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE
		)

		if (planeExistingUsingExtentResults.length) {
			// existing planes using extent first
			planeExistingUsingExtentResults = planeExistingUsingExtentResults.sort((a, b) => a.distance - b.distance)
			info = planeExistingUsingExtentResults[0]
		} else if (planeExistingResults.length) {
			// then other existing planes
			planeExistingResults = planeExistingResults.sort((a, b) => a.distance - b.distance)
			info = planeExistingResults[0]
		} else if (planeResults.length) {
			// other types except feature points
			planeResults = planeResults.sort((a, b) => a.distance - b.distance)
			info = planeResults[0]
		} else {
			// feature points if any
			info = data[0]
		}
		return info
	}

	/*
	Found intersections with anchors and planes by a ray normalized screen x and y are in range 0..1, with 0,0 at top left and 1,1 at bottom right
	returns an Array of VRHit
	*/
	_hitTestNoAnchor(normalizedScreenX, normalizedScreenY, display){
		if(this._arKitWrapper !== null){
			// Perform a hit test using the ARKit integration
			let hits = this._arKitWrapper.hitTestNoAnchor(normalizedScreenX, normalizedScreenY);
			for (let i = 0; i < hits.length; i++) {
				hits[i].modelMatrix[13] += XRViewPose.SITTING_EYE_HEIGHT
			}
			if(hits.length == 0){
				return null;
			}
			return hits;
		} else if(this._vrDisplay !== null) {
			// Perform a hit test using the ARCore data
			let hits = this._vrDisplay.hitTest(normalizedScreenX, normalizedScreenY)
			for (let i = 0; i < hits.length; i++) {
				hits[i].modelMatrix[13] += XRViewPose.SITTING_EYE_HEIGHT
			}
			if(hits.length == 0){
				return null;
			}
			return hits;
		} else {
			// No platform support for finding anchors
			return null;
		}
	}

	_getHasLightEstimate(){
		if(this._arKitWrapper !== null){
			return true;
		}else{
			return false;
		}
	}

	_getLightAmbientIntensity(){
		if(this._arKitWrapper !== null){
			this._lightEstimate.ambientIntensity = this._arKitWrapper.lightIntensity;
			return this._lightEstimate.ambientIntensity;
		}else{
			// No platform support for ligth estimation
			return null;
		}
	}

	/*
	No floor in AR
	*/
	_findFloorAnchor(display, uid=null){
		return new Promise((resolve, reject) => {
			resolve(null)
		})
	}

	
}
