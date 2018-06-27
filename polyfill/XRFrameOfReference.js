import XRCoordinateSystem from './XRCoordinateSystem.js'

export default class XRFrameOfReference extends XRCoordinateSystem {
	constructor(device, type, stageBounds=null, emulatedHeight=0){
		super(device, type)
		this._stageBounds = stageBounds
		this._emulatedHeight = emulatedHeight
	}

	get bounds(){
		// readonly attribute VRStageBounds? bounds;
		return this._stageBounds
	}

	get emulatedHeight(){
		// readonly attribute double emulatedHeight;
		return this._emulatedHeight
	}

	// attribute EventHandler onboundschange;
}

XRFrameOfReference.HEAD_MODEL = 'headModel'
XRFrameOfReference.EYE_LEVEL = 'eyeLevel'
XRFrameOfReference.STAGE = 'stage'

XRFrameOfReference.TYPES = [
	XRFrameOfReference.HEAD_MODEL,
	XRFrameOfReference.EYE_LEVEL,
	XRFrameOfReference.STAGE
]