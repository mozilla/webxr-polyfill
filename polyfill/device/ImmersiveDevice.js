import XRDevice from '../XRDevice.js'
import XRView from '../XRView.js'
import XRSession from '../XRSession.js'
import XRDevicePose from '../XRDevicePose.js'

import MatrixMath from '../fill/MatrixMath.js'
import Quaternion from '../fill/Quaternion.js'
import Vector3 from '../fill/Vector3.js'

/*
ImmersiveDevice wraps a WebVR 1.1 device, like a Vive, Rift, or Daydream.
*/
export default class ImmersiveDevice extends XRDevice {
	constructor(xr, vrDevice){
		super(xr, vrDevice.deviceName, vrDevice.capabilities.hasExternalDevice)
		this._vrDevice = vrDevice
		this._vrFrameData = new VRFrameData()

		// The view projection matrices will be reset using VRFrameData during this._handleNewFrame
		this._leftView = new XRView(this._fov, this._depthNear, this._depthFar, XRView.LEFT)
		this._rightView = new XRView(this._fov, this._depthNear, this._depthFar, XRView.RIGHT)
		this._views = [this._leftView, this._rightView]

		// These will be used to set the head and eye level poses during this._handleNewFrame
		this._deviceOrientation = new Quaternion()
		this._devicePosition = new Vector3()
		this._deviceWorldMatrix = new Float32Array(16)
	}

	/*
	Called via the XRSession.requestAnimationFrame
	*/
	_requestAnimationFrame(callback){
		if(this._vrDevice.isPresenting){
			this._vrDevice.requestAnimationFrame(callback)
		} else {
			window.requestAnimationFrame(callback)
		}
	}

	/*
	Called by a session to indicate that its baseLayer attribute has been set.
	This is where the VRDevice is used to create a session 
	*/
	_handleNewBaseLayer(baseLayer){
		this._vrDevice.requestPresent([{
			source: baseLayer._context.canvas
		}]).then(() => {
			const leftEye = this._vrDevice.getEyeParameters('left')
			const rightEye = this._vrDevice.getEyeParameters('right')
			baseLayer._context.canvas.width = Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2
			baseLayer._context.canvas.height = Math.max(leftEye.renderHeight, rightEye.renderHeight)
			baseLayer._context.canvas.style.position = 'absolute'
			baseLayer._context.canvas.style.bottom = '1px'
			baseLayer._context.canvas.style.right = '1px'
			document.body.appendChild(baseLayer._context.canvas)
		}).catch(e => {
			console.error('Unable to init WebVR 1.1 device', e)
		})
	}

	/*
	Called by a session before it hands a new XRPresentationFrame to the app
	*/
	_handleNewFrame(frame){
		if(this._vrDevice.isPresenting){
			this._updateFromVRFrameData()
		}
	}

	_handleAfterFrame(frame){
		if(this._vrDevice.isPresenting){
			this._vrDevice.submitFrame()
		}
	}

	_supportedCreationParameters(parameters){
		return parameters.type === XRSession.REALITY && parameters.exclusive === true
	}

	_updateFromVRFrameData(){
		this._vrDevice.getFrameData(this._vrFrameData)
		this._leftView.setProjectionMatrix(this._vrFrameData.leftProjectionMatrix)
		this._rightView.setProjectionMatrix(this._vrFrameData.rightProjectionMatrix)
		if(this._vrFrameData.pose){
			if(this._vrFrameData.pose.orientation){
				this._deviceOrientation.set(...this._vrFrameData.pose.orientation)
			}
			if(this._vrFrameData.pose.position){
				this._devicePosition.set(...this._vrFrameData.pose.position)
			}
			MatrixMath.mat4_fromRotationTranslation(this._deviceWorldMatrix, this._deviceOrientation.toArray(), this._devicePosition.toArray())
			if(this._vrDevice.stageParameters && this._vrDevice.stageParameters.sittingToStandingTransform){
				MatrixMath.mat4_multiply(this._deviceWorldMatrix, this._vrDevice.stageParameters.sittingToStandingTransform, this._deviceWorldMatrix)
			}
			this._headPose._setPoseModelMatrix(this._deviceWorldMatrix)
			this._eyeLevelPose.position = this._devicePosition.toArray()
		}
	}
}