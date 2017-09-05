import EventHandlerBase from './fill/EventHandlerBase.js'
import XRFieldOfView from './XRFieldOfView.js'

/*
Each XRDisplay represents a method of using a specific type of hardware to render AR or VR realities and layers.

This doesn't yet support a geospatial coordinate system
*/
export default class XRDisplay extends EventHandlerBase {
	constructor(xr, displayName, isExternal, reality){
		super()
		this._xr = xr
		this._displayName = displayName
		this._isExternal = isExternal
		this._reality = reality // The Reality instance that is currently displayed

		this._headModelCoordinateSystem = new XRCoordinateSystem(this, XRCoordinateSystem.HEAD_MODEL)
		this._eyeLevelCoordinateSystem = new XRCoordinateSystem(this, XRCoordinateSystem.EYE_LEVEL)
		this._stageCoordinateSystem = new XRCoordinateSystem(this, XRCoordinateSystem.STAGE)

		this._headPose = new XRViewPose([0, 0, 0])
		this._eyeLevelPose = new XRViewPose([0, 0, 0])
		this._stagePose = new XRViewPose([0, -XRViewPose.DEFAULT_EYE_HEIGHT, 0])

		var fov = 50/2;
		this._fov = new XRFieldOfView(fov, fov, fov, fov)
		this._depthNear = 0.1
		this._depthFar = 1000

		this._views = []
	}

	get displayName(){ return this._displayName }

	get isExternal(){ return this._isExternal }

	supportsSession(parameters){
		// parameters: XRSessionCreateParametersInit 
		// returns Promise<boolean>
		return new Promise((resolve, reject) => {
			resolve(this._supportedCreationParameters(parameters))
		})
	}

	requestSession(parameters){
		return new Promise((resolve, reject) => {
			if(this._supportedCreationParameters(parameters) === false){
				reject()
				return
			}
			resolve(this._createSession(parameters))
		})
	}

	_createSession(parameters){
		throw 'Should be implemented by extending class'
	}

	_supportedCreationParameters(parameters){
		throw 'Should be implemented by extending class'
	}

	/*
	Called by a session before it hands a new XRPresentationFrame to the app
	*/
	_handleNewFrame(frame){}

	//attribute EventHandler ondeactivate;
}
