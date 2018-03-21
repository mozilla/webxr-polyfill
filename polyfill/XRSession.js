import EventHandlerBase from './fill/EventHandlerBase.js'

/*
A script that wishes to make use of an XRDisplay can request an XRSession.
An XRSession provides a list of the available Reality instances that the script may request as well as make a request for an animation frame.
*/
export default class XRSession extends EventHandlerBase {
	constructor(xr, display, createParameters){
		super(xr)
		this._xr = xr
		this._display = display
		this._createParameters = createParameters
		this._ended = false

		this._baseLayer = null
		this._stageBounds = null
	}

	get display(){ return this._display }

	get createParameters(){ return this._parameters }

	get realities(){ return this._xr._sharedRealities }

	get reality(){ return this._display._reality }

	get baseLayer(){
		return this._baseLayer
	}

	set baseLayer(value){
		this._baseLayer = value
		this._display._handleNewBaseLayer(this._baseLayer)
	}

	get depthNear(){ this._display._depthNear }
	set depthNear(value){ this._display._depthNear = value }

	get depthFar(){ this._display._depthFar }
	set depthFar(value){ this._display._depthFar = value }

	get hasStageBounds(){ this._stageBounds !== null }

	get stageBounds(){ return this._stageBounds }

	requestFrame(callback){
		if(this._ended) return null
		if(typeof callback !== 'function'){
			throw 'Invalid callback'
		}
		return this._display._requestAnimationFrame(() => {
			const frame = this._createPresentationFrame()
			this._display._reality._handleNewFrame(frame)
			this._display._handleNewFrame(frame)
			callback(frame)
			this._display._handleAfterFrame(frame)
		})
	}

	cancelFrame(handle){
		return this._display._cancelAnimationFrame(handle)
	}

	end(){
		if(this._ended) return
		this._ended = true
		this._display._stop()
		return new Promise((resolve, reject) => {
			resolve()
		})
	}

	setVideoFrameHandler(callback) {
		if (callback instanceof Worker) {
			var worker = callback;
			callback = 	(ev => { 
				var cv = ev.detail
				var buffers = cv.frame.buffers
				var buffs = []
				for (var i = 0; i < buffers.length; i++) {
					buffs.push(buffers[i].buffer)
				}
				worker.postMessage(cv, buffs);
			})	
		}
		this._display.addEventListener("videoFrame", callback)
	}

	requestVideoFrame(buffers) {
		this._display._requestVideoFrame(buffers);
	}

	_createPresentationFrame(){
		return new XRPresentationFrame(this)
	}

	_getCoordinateSystem(...types){
		for(let type of types){
			switch(type){
				case XRCoordinateSystem.HEAD_MODEL:
					return this._display._headModelCoordinateSystem
				case XRCoordinateSystem.EYE_LEVEL:
					return this._display._eyeLevelCoordinateSystem
				case XRCoordinateSystem.TRACKER:
					return this._display._trackerCoordinateSystem
				case XRCoordinateSystem.GEOSPATIAL:
					// Not supported yet
				default:
					continue
			}
		}
		return null
	}
	
	/*
	attribute EventHandler onblur;
	attribute EventHandler onfocus;
	attribute EventHandler onresetpose;
	attribute EventHandler onrealitychanged;
	attribute EventHandler onrealityconnect;
	attribute EventHandler onrealitydisconnect;
	attribute EventHandler onboundschange;
	attribute EventHandler onended;
	*/
}

XRSession.REALITY = 'reality'
XRSession.AUGMENTATION = 'augmentation'

XRSession.TYPES = [XRSession.REALITY, XRSession.AUGMENTATION]
