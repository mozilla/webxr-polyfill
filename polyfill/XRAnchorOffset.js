import MatrixMath from './fill/MatrixMath.js'
import Quaternion from './fill/Quaternion.js'

import XRAnchor from './XRAnchor.js'
import XRCoordinates from './XRCoordinates.js'

/*
XRAnchorOffset represents a pose in relation to an XRAnchor
*/
export default class XRAnchorOffset {
	constructor(anchorUID, poseMatrix=null){
		this._anchorUID = anchorUID
		this._poseMatrix = poseMatrix || MatrixMath.mat4_generateIdentity()
	}

	get anchorUID(){ return this._anchorUID }

	/*
	A Float32Array(16) representing a column major affine transform matrix
	*/
	get poseMatrix(){ return this._poseMatrix }
	
	set poseMatrix(array16){
		for(let i=0; i < 16; i++){
			this._poseMatrix[i] = array16[i]
		}
	}

	/*
	returns a Float32Array(4) representing an x, y, z position from this.poseMatrix
	*/
	get position(){
		return new Float32Array([this._poseMatrix[12], this._poseMatrix[13], this._poseMatrix[14]])
	}

	/*
	returns a Float32Array(4) representing x, y, z, w of a quaternion from this.poseMatrix
	*/
	get orientation(){
		let quat = new Quaternion()
		quat.setFromRotationMatrix(this._poseMatrix)
		return quat.toArray()
	}

	/*
	Return an XRCoordinates in the same coordinate system as `anchor` that is offset by this XRAnchorOffset.poseMatrix
	*/
	getTransformedCoordinates(anchor){
		const coordinates = new XRCoordinates(anchor.coordinates._display, anchor.coordinates.coordinateSystem)
		MatrixMath.mat4_multiply(coordinates.poseMatrix, this._poseMatrix, anchor.coordinates.poseMatrix)
		return coordinates
	}
}
