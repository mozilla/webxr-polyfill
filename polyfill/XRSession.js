import EventHandlerBase from './fill/EventHandlerBase.js'

/*
A script that wishes to make use of an XRDevice can request an XRSession.
*/
export default class XRSession extends EventHandlerBase {
	constructor(xr, device, createParameters){
		super(xr)
		this._xr = xr
		this._device = device
		this._createParameters = createParameters
		this._ended = false

		this._baseLayer = new XRWebGLLayer(this, createParameters.outputContext.canvas.getContext('webgl'))
		this._device._handleNewBaseLayer(this._baseLayer)
	}

	get device(){ return this._device }

	get exclusive(){ return this._createParameters.exclusive }

	get outputContext(){ return this._createParameters.outputContext }

	get depthNear(){ this._device._depthNear }
	set depthNear(value){ this._device._depthNear = value }

	get depthFar(){ this._device._depthFar }
	set depthFar(value){ this._device._depthFar = value }

	get baseLayer(){ return this._baseLayer }

	requestFrameOfReference(type, options){
		// Promise<VRFrameOfReference> requestFrameOfReference(VRFrameOfReferenceType type, optional VRFrameOfReferenceOptions options);
		return new Promise((resolve, reject) => {
			switch(type){
				case XRFrameOfReference.HEAD_MODEL:
					resolve(this._device._headModelCoordinateSystem)
				case XRFrameOfReference.EYE_LEVEL:
					resolve(this._device._eyeLevelCoordinateSystem)
				case XRFrameOfReference.STAGE:
					resolve(this._device._stageCoordinateSystem)
				default:
					reject()
			}
		})
	}

	requestFrame(callback){
		if(this._ended) return null
		if(typeof callback !== 'function'){
			throw 'Invalid callback'
		}
		return this._device._requestAnimationFrame(() => {
			const frame = this._createPresentationFrame()
			this._device._handleNewFrame(frame)
			callback(frame)
			this._device._handleAfterFrame(frame)
		})
	}

	cancelFrame(handle){
		return this._device._cancelAnimationFrame(handle)
	}

	end(){
		if(this._ended) return
		this._ended = true
		this._device._stop()
		return new Promise((resolve, reject) => {
			resolve()
		})
	}

	_createPresentationFrame(){
		return new XRPresentationFrame(this)
	}

	/*
	attribute EventHandler onblur;
	attribute EventHandler onfocus;
	attribute EventHandler onresetpose;
	attribute EventHandler onend;
	*/
}
