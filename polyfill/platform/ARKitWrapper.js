import EventHandlerBase from '../fill/EventHandlerBase.js'

/*
ARKitWrapper talks to Apple ARKit, as exposed by Mozilla's test ARDemo app.
It won't function inside a browser like Firefox.

ARKitWrapper is a singleton. Use ARKitWrapper.GetOrCreate() to get the instance, then add event listeners like so:

	if(ARKitWrapper.HasARKit()){
		let arKitWrapper = ARKitWrapper.GetOrCreate()
		arKitWrapper.addEventListener(ARKitWrapper.INIT_EVENT, ev => { console.log('ARKit initialized', ev) })
		arKitWrapper.addEventListener(ARKitWrapper.WATCH_EVENT, ev => { console.log('ARKit update', ev) })
		arKitWrapper.watch({
			location: boolean,
			camera: boolean,
			objects: boolean,
			debug: boolean,
			h_plane: boolean,
			hit_test_result: 'hit_test_plane'
		})
	}

*/
export default class ARKitWrapper extends EventHandlerBase {
	constructor() {
		super()
		if(ARKitWrapper.HasARKit() === false){
			throw 'ARKitWrapper will only work in Mozilla\'s ARDemo test app'
		}
		if(typeof ARKitWrapper.GLOBAL_INSTANCE !== 'undefined'){
			throw 'ARKitWrapper is a singleton. Use ARKitWrapper.GetOrCreate() to get the global instance.'
		}

		this._deviceId = null
		this._isWatching = false
		this._isInitialized = false
		this._rawARData = null

		this._globalCallbacksMap = {} // Used to map a window.ARCallback method name to an ARKitWrapper.on* method name
		// Set up the window.ARCallback methods that the ARKit bridge depends on
		let callbackNames = ['onInit', 'onWatch', 'onStop', 'onHitTest', 'onAddAnchor']
		for(let i=0; i < callbackNames.length; i++){
			this._generateGlobalCallback(callbackNames[i], i)
		}

		// Set up some named global methods that the ARKit to JS bridge uses and send out custom events when they are called
		let eventCallbacks = [
			['onStartRecording', ARKitWrapper.RECORD_START_EVENT],
			['onStopRecording', ARKitWrapper.RECORD_STOP_EVENT],
			['didMoveBackground', ARKitWrapper.DID_MOVE_BACKGROUND_EVENT],
			['willEnterForeground', ARKitWrapper.WILL_ENTER_FOREGROUND_EVENT],
			['arkitInterrupted', ARKitWrapper.INTERRUPTED_EVENT],
			['arkitInterruptionEnded', ARKitWrapper.INTERRUPTION_ENDED_EVENT], 
			['showDebug', ARKitWrapper.SHOW_DEBUG_EVENT]
		]
		for(let i=0; i < eventCallbacks.length; i++){
			window[eventCallbacks[i][0]] = (detail) => {
				detail = detail || null
				this.dispatchEvent(
					new CustomEvent(
						ARKitWrapper[eventCallbacks[i][1]],
						{
							source: this,
							detail: detail
						}
					)
				)
			}
		}
	}

	static GetOrCreate(options = null){
		if(typeof ARKitWrapper.GLOBAL_INSTANCE === 'undefined'){
			ARKitWrapper.GLOBAL_INSTANCE = new ARKitWrapper()
			options = (options && typeof(options) == 'object') ? options : {}
			ARKitWrapper.GLOBAL_INSTANCE._sendInit(options)
		} 
		return ARKitWrapper.GLOBAL_INSTANCE
	}

	static HasARKit(){
		return typeof window.webkit !== 'undefined'
	}

	get deviceId(){ return this._deviceId } // The ARKit provided device ID
	get isWatching(){ return this._isWatching } // True if ARKit is sending frame data
	get isInitialized(){ return this._isInitialized } // True if this instance has received the onInit callback from ARKit
	get hasData(){ return this._rawARData !== null } // True if this instance has received data via onWatch

	/*
	Useful for waiting for or immediately receiving notice of ARKit initialization
	*/
	waitForInit(){
		return new Promise((resolve, reject) => {
			if(this._isInitialized){
				resolve()
				return
			}
			let callback = () => {
				this.removeEventListener(ARKitWrapper.INIT_EVENT, callback, false)
				resolve()
			}
			this.addEventListener(ARKitWrapper.INIT_EVENT, callback, false)
		})
	}

	/*
	getData looks into the most recent ARKit data (as received by onWatch) for a key
	returns the key's value or null if it doesn't exist or if a key is not specified it returns all data
	*/
	getData(key = null){
		if (key === null) {
			return this._rawARData
		}
		if(this._rawARData && typeof this._rawARData[key] !== 'undefined'){
			return this._rawARData[key]
		}
		return null
	}	

	/*
	returns
		{
			uuid: DOMString,
			transform: [4x4 column major affine transform]
		}

	return null if object with `uuid` is not found
	*/
	getObject(uuid){
		if (!this._isInitialized) {
			return null
		}
		const objects = this.getKey('objects')
		if(objects === null) return null
		for(const object of objects){
			if(object.uuid === uuid){
				return object
			}
		}
		return null
	}

	/*
	Sends a hitTest message to ARKit to get hit testing results
	x, y - screen coordinates normalized to 0..1
	types - bit mask of hit testing types
	*/
	hitTest(x, y, types = ARKitWrapper.HIT_TEST_TYPE_ALL) {
		if (!this._isInitialized) {
			return false
		}
		window.webkit.messageHandlers.hitTest.postMessage({
			x: x,
			y: y,
			type: types,
			callback: this._globalCallbacksMap.onHitTest
		})
	}

	/*
	Sends an addAnchor message to ARKit
	*/
	addAnchor(uuid, transform) {
		if (!this._isInitialized) {
			return false
		}
		window.webkit.messageHandlers.addAnchor.postMessage({
			uuid: uuid,
			transform: transform,
			callback: this._globalCallbacksMap.onAddAnchor
		})
	}
    
	/*
	If this instance is currently watching, send the stopAR message to ARKit to request that it stop sending data on onWatch
	*/
	stop() {
		if (!this._isWatching) {
			return
		}
		window.webkit.messageHandlers.stopAR.postMessage({
			callback: this._globalCallbacksMap.onStop
		})
	}
	
	/*
	If not already watching, send a watchAR message to ARKit to request that it start sending per-frame data to onWatch
	options: the options map for ARKit
		{
			location: boolean,
			camera: boolean,
			objects: boolean,
			h_plane: boolean,
			hit_test_result: 'hit_test_plane'
		}
	*/
	watch(options=null) {
		if (!this._isInitialized) {
			return false
		}
		if(this._isWatching){
			return true
		}
		this._isWatching = true

		if(options === null){
			options = {
				location: true,
				camera: true,
				objects: true,
				h_plane: true,
				hit_test_result: 'hit_test_plane'
			}
		}
		
		const data = {
			options: options,
			callback: this._globalCallbacksMap.onWatch
		}
		window.webkit.messageHandlers.watchAR.postMessage(data)
		return true
	}

	/*
	Sends a showDebug message to ARKit to indicate whether the Metal layer should show debug info like detected planes
	*/
	setDebugDisplay(showDebug) {
		window.webkit.messageHandlers.showDebug.postMessage({
			debug: showDebug
		})
	}

	/*
	Sends a setUIOptions message to ARKit to set ui options (show or hide ui elements)
	options: {
		browser: true,
		points: true,
		focus: true,
		rec: true,
		rec_time: true,
		mic: true,
		build: true,
		plane: true,
		warnings: true,
		anchors: true,
		debug: true
	}
	*/
	setUIOptions(options) {
		window.webkit.messageHandlers.setUIOptions.postMessage(options)
	}

	/*
	Called during instance creation to send a message to ARKit to initialize and create a device ID
	Usually results in ARKit calling back to _onInit with a deviceId
	options: {
		ui: {
			browser: true,
			points: true,
			focus: true,
			rec: true,
			rec_time: true,
			mic: true,
			build: true,
			plane: true,
			warnings: true,
			anchors: true,
			debug: true
		}
	}
	*/
	_sendInit(options){
		// get device id
		window.webkit.messageHandlers.initAR.postMessage({
			options: options,
			callback: this._globalCallbacksMap.onInit
		})
	}

	/*
	Callback for when ARKit is initialized
	deviceId: DOMString with the AR device ID
	*/
	_onInit(deviceId) {
		this._deviceId = deviceId
		this._isInitialized = true
		this.dispatchEvent(new CustomEvent(ARKitWrapper.INIT_EVENT, {
			source: this
		}))
	}

	/*
	_onWatch is called from native ARKit on each frame:
		data:
		{
			"camera_transform":[4x4 column major affine transform matrix],
			"projection_camera":[4x4 projection matrix],
			"location":{
				"altitude": 176.08457946777344,
				"longitude": -79.222516606740456,
				"latitude": 35.789005972772181
			},
			"objects":[
				{
					uuid: DOMString (unique UID),
					transform: [4x4 column major affine transform]
				}, ...
			]
		}

	*/
	_onWatch(data) {
		this._rawARData = data
		this.dispatchEvent(new CustomEvent(ARKitWrapper.WATCH_EVENT, {
			source: this,
			detail: this._rawARData
		}))
	}

	/*
	Callback from ARKit for when sending per-frame data to onWatch is stopped
	*/
	_onStop() {
		this._isWatching = false
		this.dispatchEvent(new CustomEvent(ARKitWrapper.STOP_EVENT, {
			source: this
		}))
	}

	/*
	Callback from ARKit for when it does the work initiated by sending the addAnchor message from JS
	data: {
		uuid - the anchor's uuid,
		transform - anchor transformation matrix
	}
	*/
	_onAddAnchor(data) {
		this.dispatchEvent(new CustomEvent(ARKitWrapper.ADD_ANCHOR_EVENT, {
			source: this,
			detail: data
		}))
	}

	/*
	Callback from ARKit for when it does the work initiated by sending the hitTest message from JS
	ARKit returns an array of hit results
	data: [
		{
			type: hitTestType,
			world_transform: matrix4x4 - specifies the position and orientation relative to WCS,
			local_transform: matrix4x4 - the position and orientation of the hit test result relative to the nearest anchor or feature point,
			anchor: {uuid, transform, ...} - the anchor representing the detected surface, if any
		},
		...
	]
	@see https://developer.apple.com/documentation/arkit/arframe/2875718-hittest
	*/
	_onHitTest(data) {
		this.dispatchEvent(new CustomEvent(ARKitWrapper.HIT_TEST_EVENT, {
			source: this,
			detail: data
		}))
	}

	/*
	The ARKit iOS app depends on several callbacks on `window`. This method sets them up.
	They end up as window.ARCallback? where ? is an integer.
	You can map window.ARCallback? to ARKitWrapper instance methods using _globalCallbacksMap
	*/
	_generateGlobalCallback(callbackName, num) {
		const name = 'ARCallback' + num
		this._globalCallbacksMap[callbackName] = name
		const self = this
		window[name] = function(...deviceData) {
			self['_' + callbackName](...deviceData)
		}
	}
}

// ARKitWrapper event names:
ARKitWrapper.INIT_EVENT = 'arkit-init'
ARKitWrapper.WATCH_EVENT = 'arkit-watch'
ARKitWrapper.STOP_EVENT = 'arkit-stop'
ARKitWrapper.ADD_ANCHOR_EVENT = 'arkit-add-anchor'
ARKitWrapper.RECORD_START_EVENT = 'arkit-record-start'
ARKitWrapper.RECORD_STOP_EVENT = 'arkit-record-stop'
ARKitWrapper.DID_MOVE_BACKGROUND_EVENT = 'arkit-did-move-background'
ARKitWrapper.WILL_ENTER_FOREGROUND_EVENT = 'arkit-will-enter-foreground'
ARKitWrapper.INTERRUPTED_EVENT = 'arkit-interrupted'
ARKitWrapper.INTERRUPTION_ENDED_EVENT = 'arkit-interruption-ended'
ARKitWrapper.HIT_TEST_EVENT = 'arkit-hit-test'
ARKitWrapper.SHOW_DEBUG_EVENT = 'arkit-show-debug'

// hit test types
ARKitWrapper.HIT_TEST_TYPE_FEATURE_POINT = 1
ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE = 8
ARKitWrapper.HIT_TEST_TYPE_ESTIMATED_HORIZONTAL_PLANE = 2
ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_EXTENT = 16

ARKitWrapper.HIT_TEST_TYPE_ALL = ARKitWrapper.HIT_TEST_TYPE_FEATURE_POINT |
	ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE |
	ARKitWrapper.HIT_TEST_TYPE_ESTIMATED_HORIZONTAL_PLANE |
	ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_EXTENT
