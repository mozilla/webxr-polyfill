import EventHandlerBase from './EventHandlerBase.js'

/*
DeviceOrientationTracker keeps track of device orientation, which can be queried usnig `getOrientation`
*/
export default class DeviceOrientationTracker extends EventHandlerBase {
	constructor(){
		super()
		this._deviceOrientation = null
		this._windowOrientation = 0

		window.addEventListener('orientationchange', () => {
			this._windowOrientation = window.orientation || 0
		}, false)
		window.addEventListener('deviceorientation', ev => {
			this._deviceOrientation = ev
			this.dispatchEvent(new CustomEvent(DeviceOrientationTracker.ORIENTATION_UPDATE_EVENT_NAME, {
				deviceOrientation: this._deviceOrientation,
				windowOrientation: this._windowOrientation
			}))
		}, false)
	}

	/*
	getOrientation sets the value of outQuaternion to the most recently tracked device orientation
	returns true if a device orientation has been received, otherwise false
	*/
	getOrientation(outQuaternion){
		if(this._deviceOrientation === null){
			outQuaternion.set(0, 0, 0, 1)
			return false
		}
		DeviceOrientationTracker.WORKING_EULER.set(
			this._deviceOrientation.beta * DeviceOrientationTracker.DEG_TO_RAD, 
			this._deviceOrientation.alpha * DeviceOrientationTracker.DEG_TO_RAD, 
			-1 * this._deviceOrientation.gamma * DeviceOrientationTracker.DEG_TO_RAD, 
			'YXZ'
		)
		outQuaternion.setFromEuler(DeviceOrientationTracker.WORKING_EULER)
		outQuaternion.multiply(DeviceOrientationTracker.HALF_PI_AROUND_X)
		outQuaternion.multiply(DeviceOrientationTracker.WORKING_QUATERNION.setFromAxisAngle(DeviceOrientationTracker.Z_AXIS, -this._windowOrientation * DeviceOrientationTracker.DEG_TO_RAD))
		return true
	}
}

DeviceOrientationTracker.ORIENTATION_UPDATE_EVENT_NAME = 'orientation-update'

DeviceOrientationTracker.Z_AXIS = new THREE.Vector3(0, 0, 1)
DeviceOrientationTracker.WORKING_EULER = new THREE.Euler()
DeviceOrientationTracker.WORKING_QUATERNION = new THREE.Quaternion()
DeviceOrientationTracker.HALF_PI_AROUND_X = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5))
DeviceOrientationTracker.DEG_TO_RAD = Math.PI / 180
