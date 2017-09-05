import MatrixMath from './fill/MatrixMath.js'

/*
XRCoordinateSystem represents the origin of a 3D coordinate system positioned at a known frame of reference.
The XRCoordinateSystem is a string from XRCoordinateSystem.TYPES:

- XRCoordinateSystem.HEAD_MODEL: origin is aligned with the pose of the head, as sensed by HMD or handset trackers
- XRCoordinateSystem.EYE_LEVEL: origin is at a fixed distance above the ground
- XRCoordinateSystem.STAGE: origin is at ground level
- XRCoordinateSystem.GEOSPATIAL: origin is at the East, Up, South plane tangent to the planet at the latitude, longitude, and altitude represented by the `XRCoordinateSystem.cartographicCoordinates`.

*/
export default class XRCoordinateSystem {
	constructor(display, type, cartographicCoordinates=null){
		this._display = display
		this._type = type
		this._cartographicCoordinates = cartographicCoordinates
	}

	get cartographicCoordinates(){ return this._cartographicCoordinates }

	get type(){ return this._type }

	get _poseModelMatrix(){
		switch(this._type){
			case XRCoordinateSystem.HEAD_MODEL:
				return this._display._headPose.poseModelMatrix
			case XRCoordinateSystem.EYE_LEVEL:
				return this._display._eyeLevelPose.poseModelMatrix
			case XRCoordinateSystem.STAGE:
				return this._display._stagePose.poseModelMatrix
			case XRCoordinateSystem.GEOSPATIAL:
				throw 'This polyfill does not yet handle geospatial coordinate systems'
			default:
				throw 'Unknown coordinate system type: ' + this._type
		}
	}
	
	getTransformTo(otherCoordinateSystem){
		let out = new Float32Array([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		])

		// apply inverse of this system's poseModelMatrix to the identity matrix
		let inverse = new Float32Array(16)
		MatrixMath.mat4_invert(inverse, this._poseModelMatrix)
		MatrixMath.mat4_multiply(out, inverse, out)

		// apply other system's poseModelMatrix
		MatrixMath.mat4_multiply(out, otherCoordinateSystem._poseModelMatrix, out)
		return out
	}
}

XRCoordinateSystem.HEAD_MODEL = "headModel"
XRCoordinateSystem.EYE_LEVEL = "eyeLevel"
XRCoordinateSystem.STAGE = "stage"
XRCoordinateSystem.GEOSPATIAL = "geospatial"

XRCoordinateSystem.TYPES = [
	XRCoordinateSystem.HEAD_MODEL,
	XRCoordinateSystem.EYE_LEVEL,
	XRCoordinateSystem.STAGE,
	XRCoordinateSystem.GEOSPATIAL
]