import MatrixMath from './fill/MatrixMath.js'
import XRFrameOfReference from './XRFrameOfReference.js'

/*
XRCoordinateSystem represents the origin of a 3D coordinate system positioned at a known frame of reference.
The type is a string from XRFrameOfReference.TYPES:

These types are used by the app code when requesting a coordinate system from the session:
- XRFrameOfReference.HEAD_MODEL: origin is aligned with the pose of the head, as sensed by HMD or handset trackers
- XRFrameOfReference.EYE_LEVEL: origin is at a fixed distance above the ground
- XRFrameOfReference.STAGE: origin is at floor level

*/
export default class XRCoordinateSystem {
	constructor(device, type){
		this._device = device
		this._type = type

		this.__relativeMatrix = MatrixMath.mat4_generateIdentity()
		this._workingMatrix = MatrixMath.mat4_generateIdentity()
	}

	getTransformTo(otherCoordinateSystem){
		// apply inverse of the poseModelMatrix to the identity matrix
		let inverse = MatrixMath.mat4_invert(new Float32Array(16), otherCoordinateSystem._poseModelMatrix)
		let out = MatrixMath.mat4_generateIdentity()
		MatrixMath.mat4_multiply(out, inverse, out)

		// apply the other system's poseModelMatrix
		MatrixMath.mat4_multiply(out, this._poseModelMatrix, out)
		return out
	}

	get _relativeMatrix(){ return this.__relativeMatrix }

	set _relativeMatrix(value){
		for(let i=0; i < 16; i++){
			this.__relativeMatrix[i] = value[i]
		}
	}

	get _poseModelMatrix(){
		switch(this._type){
			case XRFrameOfReference.HEAD_MODEL:
				return this._device._headPose.poseModelMatrix
			case XRFrameOfReference.EYE_LEVEL:
				return this._device._eyeLevelPose.poseModelMatrix
			case XRFrameOfReference.STAGE:
				MatrixMath.mat4_multiply(this._workingMatrix, this.__relativeMatrix, this._device._stagePoseModelMatrix)
				return this._workingMatrix
			default:
				throw new Error('Unknown coordinate system type: ' + this._type)
		}
	}
}
