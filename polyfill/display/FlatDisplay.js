import XRDisplay from '../XRDisplay.js'
import XRView from '../XRView.js'
import XRSession from '../XRSession.js'

import MatrixMath from '../fill/MatrixMath.js'
import Quaternion from '../fill/Quaternion.js'
import Vector3 from '../fill/Vector3.js'

import DeviceOrientationTracker from '../fill/DeviceOrientationTracker.js'
import ARKitWrapper from '../platform/ARKitWrapper.js'

/*
FlatDisplay takes over a handset's full screen and presents a moving view into a Reality, as if it were a magic window.

If ARKit is present, it uses the ARKit updates to set the headModel pose.
If ARCore is available on the VRDisplays, use that to pose the headModel. (TODO)
Otherwise, use orientation events.
*/
export default class FlatDisplay extends XRDisplay {
	constructor(xr, reality){
		super(xr, 'Flat', false, reality)

		this._started = false
		this._initialized = false

		// This is used if we have ARKit support
		this._arKitWrapper = null

		// This is used if we have ARCore support
		this._vrFrameData = null

		// This is used if we are using orientation events
		this._deviceOrientationTracker = null

		// These are used if we have ARCore support or use window orientation events
		this._deviceOrientation = null			// Quaternion
		this._devicePosition = null				// Vector3
		this._deviceWorldMatrix = null			// Float32Array(16)

		// Currently only support full screen views
		this._views.push(new XRView(this._fov, this._depthNear, this._depthFar))
	}

	_start(){
		if(this._reality._vrDisplay){ // Use ARCore
			if(this._vrFrameData === null){
				this._vrFrameData = new VRFrameData()
				this._views[0]._depthNear = this._reality._vrDisplay.depthNear
				this._views[0]._depthFar = this._reality._vrDisplay.depthFar
				this._deviceOrientation = new Quaternion()
				this._devicePosition = new Vector3()
				this._deviceWorldMatrix = new Float32Array(16)
			}
		} else if(ARKitWrapper.HasARKit()){ // Use ARKit
			if(this._initialized === false){
				this._initialized = true
				this._arKitWrapper = ARKitWrapper.GetOrCreate()
				this._arKitWrapper.addEventListener(ARKitWrapper.INIT_EVENT, this._handleARKitInit.bind(this))
				this._arKitWrapper.addEventListener(ARKitWrapper.WATCH_EVENT, this._handleARKitUpdate.bind(this))
				this._arKitWrapper.waitForInit().then(() => {
					this._arKitWrapper.watch()
				})
			} else {
				this._arKitWrapper.watch()
			}
		} else { // Use device orientation
			if(this._initialized === false){
				this._initialized = true
				this._deviceOrientation = new Quaternion()
				this._devicePosition = new Vector3()
				this._deviceWorldMatrix = new Float32Array(16)
				this._deviceOrientationTracker = new DeviceOrientationTracker()
				this._deviceOrientationTracker.addEventListener(DeviceOrientationTracker.ORIENTATION_UPDATE_EVENT, this._updateFromDeviceOrientationTracker.bind(this))
			}
		}
		this.running = true
		this._reality._start()
	}

	_stop(){
		// TODO figure out how to stop ARKit and ARCore so that CameraReality can still work
	}

	/*
	Called by a session to indicate that its baseLayer attribute has been set.
	FlatDisplay just adds the layer's canvas to DOM elements created by the XR polyfill
	*/
	_handleNewBaseLayer(baseLayer){
		baseLayer._context.canvas.width = window.innerWidth
		baseLayer._context.canvas.height = window.innerHeight
		this._xr._sessionEls.appendChild(baseLayer._context.canvas)
	}

	/*
	Called by a session before it hands a new XRPresentationFrame to the app
	*/
	_handleNewFrame(frame){
		if(this._vrFrameData !== null){
			this._updateFromVRDevice()
		}
	}

	_updateFromVRDevice(){
		this._reality._vrDisplay.getFrameData(this._vrFrameData)
		this._views[0].setProjectionMatrix(this._vrFrameData.leftProjectionMatrix)
		this._deviceOrientation.set(...this._vrFrameData.pose.orientation)
		this._devicePosition.set(...this._vrFrameData.pose.position)
		this._devicePosition.add(0, XRViewPose.SITTING_EYE_HEIGHT, 0)
		MatrixMath.mat4_fromRotationTranslation(this._deviceWorldMatrix, this._deviceOrientation.toArray(), this._devicePosition.toArray())
		this._headPose._setPoseModelMatrix(this._deviceWorldMatrix)
		this._eyeLevelPose._position = this._devicePosition.toArray()
	}

	_updateFromDeviceOrientationTracker(){
		// TODO set XRView's FOV
		this._deviceOrientationTracker.getOrientation(this._deviceOrientation)
		this._devicePosition.set(this._headPose.poseModelMatrix[12], this._headPose.poseModelMatrix[13], this._headPose.poseModelMatrix[14])
		this._devicePosition.add(0, XRViewPose.SITTING_EYE_HEIGHT, 0)
		MatrixMath.mat4_fromRotationTranslation(this._deviceWorldMatrix, this._deviceOrientation.toArray(), this._devicePosition.toArray())
		this._headPose._setPoseModelMatrix(this._deviceWorldMatrix)
		this._eyeLevelPose._position = this._devicePosition.toArray()
	}

	_handleARKitUpdate(...params){
		const cameraTransformMatrix = this._arKitWrapper.getData('camera_transform')
		if (cameraTransformMatrix) {
			this._headPose._setPoseModelMatrix(cameraTransformMatrix)
			this._headPose._poseModelMatrix[13] += XRViewPose.SITTING_EYE_HEIGHT
			this._eyeLevelPose._position = this._headPose._position
		} else {
			console.log('no camera transform', this._arKitWrapper.rawARData)
		}

		const cameraProjectionMatrix = this._arKitWrapper.getData('projection_camera')
		if(cameraProjectionMatrix){
			this._views[0].setProjectionMatrix(cameraProjectionMatrix)
		} else {
			console.log('no projection camera', this._arKitWrapper.rawARData)
		}
	}

	_handleARKitInit(ev){
		setTimeout(() => {
			this._arKitWrapper.watch({
				location: true,
				camera: true,
				objects: true,
				light_intensity: true
			})
		}, 1000)
	}

	_createSession(parameters){
		this._start()
		return super._createSession(parameters)
	}

	_supportedCreationParameters(parameters){
		return parameters.type === XRSession.AUGMENTATION && parameters.exclusive === false		
	}

	//attribute EventHandler ondeactivate; // FlatDisplay never deactivates
}