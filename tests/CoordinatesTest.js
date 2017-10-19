import Test from './Test.js'

import XRDisplay from '../polyfill/XRDisplay.js'
import XRCoordinates from '../polyfill/XRCoordinates.js'
import XRCoordinateSystem from '../polyfill/XRCoordinateSystem.js'

import Quaternion from '../polyfill/fill/Quaternion.js'

export default class CoordinatesTest extends Test {
	testTransform(){
		let display1 = new MockXRDisplay()
		let trackerCoordinateSystem = new XRCoordinateSystem(display1, XRCoordinateSystem.TRACKER)
		let headCoordinateSystem = new XRCoordinateSystem(display1, XRCoordinateSystem.HEAD_MODEL)
		let eyeLevelCoordinateSystem = new XRCoordinateSystem(display1, XRCoordinateSystem.EYE_LEVEL)

		let headCoordinates = new XRCoordinates(display1, headCoordinateSystem, [0, 0, -0.5])
		let trackerCoordinates = headCoordinates.getTransformedCoordinates(trackerCoordinateSystem)
		this.assertFloatArraysEqual(
			trackerCoordinates.position, 
			[headCoordinates.position[0], XRViewPose.SITTING_EYE_HEIGHT + headCoordinates.position[1], headCoordinates.position[2]]
		)
		this.assertFloatArraysEqual(trackerCoordinates.orientation, headCoordinates.orientation)

		// Rotate the head and test the transform
		let quat1 = new Quaternion()
		quat1.setFromEuler(0, -Math.PI, 0)
		display1._headPose._orientation = quat1.toArray()
		trackerCoordinates = headCoordinates.getTransformedCoordinates(trackerCoordinateSystem)
		this.assertFloatArraysEqual(
			trackerCoordinates.position,
			[headCoordinates.position[0], XRViewPose.SITTING_EYE_HEIGHT + headCoordinates.position[1], -1 * headCoordinates.position[2]]
		)
		quat1.inverse()
		this.assertFloatArraysEqual(quat1.toArray(), trackerCoordinates.orientation)
	}
}

class MockXR {

}

class MockReality {

}

class MockXRDisplay extends XRDisplay {
	constructor(xr=null, displayName='Mock', isExternal=false, reality=null){
		super(xr ? xr : new MockXR(), displayName, isExternal, reality ? reality : new MockReality())
	}
}