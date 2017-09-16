import MatrixMath from './fill/MatrixMath.js'
import Quaternion from './fill/Quaternion.js'

import XRCoordinateSystem from './XRCoordinateSystem.js'

/*
XRCoordinates represent a pose (position and orientation) in relation to a XRCoordinateSystem.
*/
export default class XRCoordinates {
	constructor(display, coordinateSystem, position=[0, 0, 0], orientation=[0, 0, 0, 1]){
		this._display = display
		this._coordinateSystem = coordinateSystem
		this._poseMatrix = new Float32Array(16)
		MatrixMath.mat4_fromRotationTranslation(this._poseMatrix, orientation, position)
	}

	get coordinateSystem(){ return this._coordinateSystem }

	get poseMatrix(){ return this._poseMatrix }
	
	set poseMatrix(array16){
		for(let i=0; i < 16; i++){
			this._poseMatrix[i] = array16[i]
		}
	}

	get position(){
		return new Float32Array([this._poseMatrix[12], this._poseMatrix[13], this._poseMatrix[14]])
	}

	get orientation(){
		let quat = new Quaternion()
		quat.setFromRotationMatrix(this._poseMatrix)
		return quat.toArray()
	}

	/*
	Returns a new XRCoordinates that represents this XRCoordinates's pose in the otherCoordinateSystem
	May return null if there is no transform between this.coordinateSystem and otherCoordinateSystem
	*/
	getTransformedCoordinates(otherCoordinateSystem){
		// XRCoordinates? getTransformedCoordinates(XRCoordinateSystem otherCoordinateSystem)
		if(this._coordinateSystem.type === XRCoordinateSystem.GEOSPATIAL || otherCoordinateSystem.type === XRCoordinateSystem.GEOSPATIAL){
			console.error('This polyfill does not yet support geospatial coordinate systems')
			return null
		}
		const transform = this._coordinateSystem.getTransformTo(otherCoordinateSystem)
		if(transform === null){
			console.error('Could not get a transform between', this._coordinateSystem, otherCoordinateSystem)
			return null
		}
		const out = new XRCoordinates(this._display, otherCoordinateSystem)
		MatrixMath.mat4_multiply(out._poseMatrix, transform, this._poseMatrix)
		return out
	}
}