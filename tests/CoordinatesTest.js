import Test from './Test.js'

import MatrixMath from '../polyfill/fill/MatrixMath.js'
import XRDevice from '../polyfill/XRDevice.js'
import XRCoordinateSystem from '../polyfill/XRCoordinateSystem.js'

import Quaternion from '../polyfill/fill/Quaternion.js'

export default class CoordinatesTest extends Test {
	testTransform(){
		let device1 = new MockXRDevice()

		// Test that relative coordinate systems correctly provide transforms
		let relativeCoordinateSystem = new XRCoordinateSystem(device1, XRCoordinateSystem.STAGE)
		let pose = MatrixMath.mat4_generateIdentity()
		pose[12] = 1
		pose[13] = 2
		pose[14] = 3
		relativeCoordinateSystem._relativeMatrix = pose
		let r2hTransform = relativeCoordinateSystem.getTransformTo(device1._headModelCoordinateSystem)
		this.assertFloatArraysEqual(
			[1, 2 - XRDevicePose.SITTING_EYE_HEIGHT, 3],
			[r2hTransform[12], r2hTransform[13], r2hTransform[14]]
		)

		// Test the transform is where we expect it
		let h2tTransform = device1._headModelCoordinateSystem.getTransformTo(device1._stageCoordinateSystem)
		this.assertFloatArraysEqual(
			[0, XRDevicePose.SITTING_EYE_HEIGHT, 0],
			[h2tTransform[12], h2tTransform[13], h2tTransform[14]]
		)

		// Offset the head and test the transform
		device1._headPose._position = [0, XRDevicePose.SITTING_EYE_HEIGHT, 0.5]
		h2tTransform = device1._headModelCoordinateSystem.getTransformTo(device1._stageCoordinateSystem)
		this.assertFloatArraysEqual(
			[0, XRDevicePose.SITTING_EYE_HEIGHT, device1._headPose._position[2]],
			[h2tTransform[12], h2tTransform[13], h2tTransform[14]]
		)

		// Rotate the head and test the transform
		let quat1 = new Quaternion()
		quat1.setFromEuler(0, -Math.PI, 0)
		device1._headPose._orientation = quat1.toArray()
		h2tTransform = device1._headModelCoordinateSystem.getTransformTo(device1._stageCoordinateSystem)
		let stagePosition = MatrixMath.mat4_get_position(new Float32Array(3), h2tTransform)
		this.assertEqual(stagePosition[2], device1._headPose._position[2])
		quat1.inverse()
		let stageOrientation = MatrixMath.mat4_get_rotation(new Float32Array(4), h2tTransform)
		this.assertFloatArraysEqual(quat1.toArray(), stageOrientation)
	}
}

class MockXR {

}

class MockXRDevice extends XRDevice {
	constructor(xr=null, deviceName='Mock', isExternal=false){
		super(xr ? xr : new MockXR(), deviceName, isExternal)
	}
}