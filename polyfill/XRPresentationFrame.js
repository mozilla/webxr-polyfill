import MatrixMath from './fill/MatrixMath.js'
import XRFrameOfReference from './XRFrameOfReference.js'

/*
XRPresentationFrame provides all of the values needed to render a single frame of an XR scene to the XRDevice.
*/
export default class XRPresentationFrame {
	constructor(session){
		this._session = session
	}

	get views(){
		//readonly attribute FrozenArray<XRView> views;
		return this._session._device._views
	}

	getDevicePose(coordinateSystem){
		// XRDevicePose? getDevicePose(XRCoordinateSystem coordinateSystem);
		switch(coordinateSystem._type){
			case XRFrameOfReference.HEAD_MODEL:
				return this._session._device._headPose
			case XRFrameOfReference.EYE_LEVEL:
				return this._session._device._eyeLevelPose
			default:
				return null
		}
	}
}