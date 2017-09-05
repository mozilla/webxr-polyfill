import EventHandlerBase from '../fill/EventHandlerBase.js'

/*
ARKitWrapper talks to Apple ARKit, as exposed by Mozilla's test ARDemo app.
It won't function inside a browser like Firefox.

ARKitWrapper is a singleton. Use ARKitWrapper.GetOrCreate() to get the instance, then add event listeners like so:

	if(ARKitWrapper.HasARKit()){
		let arKitWrapper = ARKitWrapper.GetOrCreate()
		arKitWrapper.addEventListener(ARKitWrapper.INIT_EVENT_NAME, ev => { console.log('ARKit initialized', ev) })
		arKitWrapper.addEventListener(ARKitWrapper.WATCH_EVENT_NAME, ev => { console.log('ARKit update', ev) })
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

		this._globalCallbacksMap = {} // Used to map a window.ARCallback? method name to an ARKitWrapper.on* method name
		// Set up the window.ARCallback? methods that the ARKit bridge depends on
		let callbackNames = ['onInit', 'onWatch', 'onStop', 'onAddObject']
		for(let i=0; i < callbackNames.length; i++){
			this._generateGlobalCallback(callbackNames[i], i)
		}
	}

	static GetOrCreate(){
		if(typeof ARKitWrapper.GLOBAL_INSTANCE === 'undefined'){
			ARKitWrapper.GLOBAL_INSTANCE = new ARKitWrapper()
			ARKitWrapper.GLOBAL_INSTANCE._sendInit()
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
				this.removeEventListener(ARKitWrapper.INIT_EVENT_NAME, callback, false)
				resolve()
			}
			this.addEventListener(ARKitWrapper.INIT_EVENT_NAME, callback, false)
		})
	}

	/*
	getData looks into the most recent ARKit data (as received by onWatch) for a key
	returns the key's value or null if it doesn't exist
	*/
	getData(key){
		if(this._rawARData && typeof this._rawARData[key] !== 'undefined'){
			return this._rawARData[key]
		}
		return null
	}	

	/*
	returns

		{
			name: DOMString,
			transform: [4x4 column major affine transform]
		}

	return null if object with `name` is not found
	*/
	getObject(name){
		const objects = this.getKey('objects')
		if(objects === null) return null
		for(const object of objects){
			if(object.name === name){
				return object
			}
		}
		return null
	}

	/*
	Sends an addObject message to ARKit
	*/
	addObject(name, x, y, z) {
		window.webkit.messageHandlers.addObject.postMessage({
			name: name,
			x: x,
			y: y,
			z: z,
			callback: this._globalCallbacksMap.onAddObject
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
			debug: boolean,
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
				debug: false,
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
	Called during instance creation to send a message to ARKit to initialize and create a device ID
	Usually results in ARKit calling back to _onInit with a deviceId
	*/
	_sendInit(){
		// get device id
		window.webkit.messageHandlers.initAR.postMessage({
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
		this.dispatchEvent(new CustomEvent(ARKitWrapper.INIT_EVENT_NAME, {
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
					name: DOMString (unique UID),
					transform: [4x4 column major affine transform]
				}, ...
			]
		}

	*/
	_onWatch(data) {
		this._rawARData = JSON.parse(data)
		this.dispatchEvent(new CustomEvent(ARKitWrapper.WATCH_EVENT_NAME, {
			source: this,
			data: this._rawARData
		}))
	}

	/*
	Callback from ARKit for when sending per-frame data to onWatch is stopped
	*/
	_onStop() {
		this._isWatching = false
		this.dispatchEvent(new CustomEvent(ARKitWrapper.STOP_EVENT_NAME, {
			source: this
		}))
	}

	/*
	Callback from ARKit for when it does the work initiated by sending the addObject message from JS
	data: { ? }
	*/
	_onAddObject(data) {
		data = JSON.parse(data)
		this.dispatchEvent(new CustomEvent(ARKitWrapper.ADD_OBJECT_NAME, {
			source: this,
			data: data
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
		window[name] = function(deviceData) {
			self['_' + callbackName](deviceData)
		}
	}
}

// ARKitWrapper event names:
ARKitWrapper.INIT_EVENT_NAME = 'arkit-init'
ARKitWrapper.WATCH_EVENT_NAME = 'arkit-watch'
ARKitWrapper.STOP_EVENT_NAME = 'arkit-stop'
ARKitWrapper.ADD_OBJECT_NAME = 'arkit-add-object'
