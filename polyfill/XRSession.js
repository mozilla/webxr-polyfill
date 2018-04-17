import EventHandlerBase from './fill/EventHandlerBase.js'
import MatrixMath from './fill/MatrixMath.js'

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

		this._skip = false;

		this._frameAnchors = []
		this._tempMatrix = MatrixMath.mat4_generateIdentity()		
		this._tempMatrix2 = MatrixMath.mat4_generateIdentity()		
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
		return this._handleRequestFrame(callback)
	}

    _handleRequestFrame(callback) {
		return this._display._requestAnimationFrame(() => {
			if (this._skip) {
				this._skip = false;
				return this._handleRequestFrame(callback)
			}
			//this._skip = true;  // try skipping every second raf
			const frame = this._createPresentationFrame()
			this._updateCameraAnchor(frame)

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
		for (var i = 0; i< this._frameAnchors.length; i++) {
			this._display._reality._removeAnchor(this._frameAnchors[i])			
		}
		this._frameAnchors = null;
		this._ended = true
		this._display._stop()
		return new Promise((resolve, reject) => {
			resolve()
		})
	}

	_updateCameraAnchor(frame) {
		// new anchor each minute
		if (this._frameAnchors.length == 0 || (this._frameAnchors[0].timestamp + 60000) < frame.timestamp) {
			const headCoordinateSystem = frame.getCoordinateSystem(XRCoordinateSystem.EYE_LEVEL)
			const anchorUID = frame.addAnchor(headCoordinateSystem, [0,-1,0])
			const anchor = frame.getAnchor(anchorUID)
			anchor.timestamp = frame.timestamp;
			this._frameAnchors.unshift(anchor)

			if (this._frameAnchors.length > 10) {
				var oldAnchor = this._frameAnchors.pop()
				this._display._reality._removeAnchor(oldAnchor.uid)
			}
			return anchor;
		} else {
			return this._frameAnchors[0]
		}		
	}

	_transformToCameraAnchor(camera) {
		if (this._frameAnchors.length == 0) return camera.viewMatrix
		
		var matrix = camera.viewMatrix
		camera._anchorUid = this._frameAnchors[0].uid

		const anchorCoords = this._frameAnchors[0].coordinateSystem

		// should only have to invert anchor coords, but we're sending in the inverse
		// of the camera pose ...

		// get world to anchor by inverting anchor to world
		MatrixMath.mat4_invert(this._tempMatrix, anchorCoords._poseModelMatrix)

		// get camera to world by inverting world to camera
		// MatrixMath.mat4_invert(this._tempMatrix2, matrix)
		// MatrixMath.mat4_multiply(camera.viewMatrix, this._tempMatrix, this._tempMatrix2)
		MatrixMath.mat4_multiply(camera.viewMatrix, this._tempMatrix, matrix)
	}

	setVideoFrameHandler(callback) {
		if (callback instanceof Worker) {
			var worker = callback;
			callback = 	(ev => { 
				// var cv = ev.detail
				// var buffers = cv.frame.buffers
				// var buffs = []
				// for (var i = 0; i < buffers.length; i++) {
				// 	buffs.push(buffers[i].buffer)
				// }
				// worker.postMessage(cv, buffs);
				this._transformToCameraAnchor(ev.detail.camera)
				ev.detail.postMessageToWorker(worker, {type: "newVideoFrame"})
				ev.detail.release()
			})	
		} else {
			var originalCallback = callback;
			callback = (ev => {
				this._transformToCameraAnchor(ev.detail.camera)
				originalCallback(ev)
			})
		}
		this._display.addEventListener("videoFrame", callback)
	}

    getVideoFramePose(videoFrame, poseOut)
    {
        if (!videoFrame.camera._anchorUid) return 

		var anchor = this.reality._getAnchor(videoFrame.camera._anchorUid)
		var anchorPose = anchor.coordinateSystem._poseModelMatrix
		MatrixMath.mat4_multiply(poseOut, anchorPose, videoFrame.camera.viewMatrix )
	}
	
	requestVideoFrame() {
		this._display._requestVideoFrame();
	}

	stopVideoFrames() {
		this._display._stopVideoFrames();
	}
	
	startVideoFrames() {
		this._display._startVideoFrames();
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
