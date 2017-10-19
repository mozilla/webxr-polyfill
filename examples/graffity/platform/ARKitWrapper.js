import EventHandlerBase from '../fill/EventHandlerBase.js'

/*
ARKitWrapper talks to Apple ARKit, as exposed by Mozilla's test ARDemo app.
It won't function inside a browser like Firefox.

ARKitWrapper is a singleton. Use ARKitWrapper.GetOrCreate() to get the instance, then add watch event listener like so:

	if(ARKitWrapper.HasARKit()){
		let arKitWrapper = ARKitWrapper.GetOrCreate()
		arKitWrapper.init().then(ev => { console.log('ARKit initialized', ev) })
		arKitWrapper.addEventListener(ARKitWrapper.WATCH_EVENT, ev => { console.log('ARKit update', ev) })
		arKitWrapper.watch({
			camera: boolean,
			anchors: boolean,
			planes: boolean,
			lightEstimate: boolean
		})
	}

*/

/*
Default options for some methods
*/
const DEFAULT_OPTIONS = {
	init: {
		ui: {
			arkit: {},
			custom: {
				browser: true,
				rec: true,
				warnings: true
			}
		}
	},
	setUIOptions: {
		arkit: {},
		custom: {}
	},
	watch: {
		camera: true,
		anchors: true,
		planes: true,
		lightEstimate: true
	}
}

export default class ARKitWrapper extends EventHandlerBase {
	constructor(){
		super()
		if(ARKitWrapper.HasARKit() === false){
			throw 'ARKitWrapper will only work in Mozilla\'s ARDemo test app'
		}
		if(typeof ARKitWrapper.GLOBAL_INSTANCE !== 'undefined'){
			throw 'ARKitWrapper is a singleton. Use ARKitWrapper.GetOrCreate() to get the global instance.'
		}

		this._deviceInfo = null
		this._isWatching = false
		this._isInitialized = false
		this._rawARData = null

		this._globalCallbacksMap = {} // Used to map a window.arCallback method name to an ARKitWrapper.on* method name
		// Set up the window.arCallback methods that the ARKit bridge depends on
		let callbackNames = ['onWatch']
		for(let i=0; i < callbackNames.length; i++){
			this._generateGlobalCallback(callbackNames[i], i)
		}

		// Set up some named global methods that the ARKit to JS bridge uses and send out custom events when they are called
		let eventCallbacks = [
			['arStartRecording', ARKitWrapper.RECORD_START_EVENT],
			['arStopRecording', ARKitWrapper.RECORD_STOP_EVENT],
			['arDidMoveBackground', ARKitWrapper.DID_MOVE_BACKGROUND_EVENT],
			['arWillEnterForeground', ARKitWrapper.WILL_ENTER_FOREGROUND_EVENT],
			['arInterruption', ARKitWrapper.INTERRUPTION_EVENT],
			['arInterruptionEnded', ARKitWrapper.INTERRUPTION_ENDED_EVENT], 
			['arShowDebug', ARKitWrapper.SHOW_DEBUG_EVENT],
			['arReceiveMemoryWarning', ARKitWrapper.MEMORY_WARNING_EVENT],
			['arEnterRegion', ARKitWrapper.ENTER_REGION_EVENT],
			['arExitRegion', ARKitWrapper.EXIT_REGION_EVENT],
			['arUpdateHeading', ARKitWrapper.HEADING_UPDATED_EVENT],
			['arUpdateLocation', ARKitWrapper.LOCATION_UPDATED_EVENT],
			['arTrackingChanged', ARKitWrapper.TRACKING_CHANGED_EVENT],
			['arSessionFails', ARKitWrapper.SESSION_FAILS_EVENT],
			['arAddPlanes', ARKitWrapper.PLAINS_ADDED_EVENT],
			['arRemovePlanes', ARKitWrapper.PLAINS_REMOVED_EVENT],
			['arUpdatedAnchors', ARKitWrapper.ANCHORS_UPDATED_EVENT],
			['arTransitionToSize', ARKitWrapper.SIZE_CHANGED_EVENT]
		]
		for(let i=0; i < eventCallbacks.length; i++){
			window[eventCallbacks[i][0]] = (detail) => {
				detail = detail || null
				this.dispatchEvent(
					new CustomEvent(
						eventCallbacks[i][1],
						{
							source: this,
							detail: detail
						}
					)
				)
			}
		}
	}

	static GetOrCreate(){
		if(typeof ARKitWrapper.GLOBAL_INSTANCE === 'undefined'){
			ARKitWrapper.GLOBAL_INSTANCE = new ARKitWrapper()
		}
		return ARKitWrapper.GLOBAL_INSTANCE
	}

	static HasARKit(){
		return typeof window.webkit !== 'undefined'
	}

	get deviceInfo(){ return this._deviceInfo } // The ARKit provided device information
	get isWatching(){ return this._isWatching } // True if ARKit is sending frame data
	get isInitialized(){ return this._isInitialized } // True if this instance has received the onInit callback from ARKit
	get hasData(){ return this._rawARData !== null } // True if this instance has received data via onWatch

	/*
	Call this to send a message to ARKit to initialize and get device information
	Results in ARKit calling back to _onInit with device information
	options: {
		ui: {
			arkit: {
				statistics: boolean,
				plane: boolean,
				focus: boolean,
				anchors: boolean
			},
			custom: {
				browser: boolean,
				points: boolean,
				rec: boolean,
				rec_time: boolean,
				mic: boolean,
				build: boolean,
				warnings: boolean,
				debug: boolean
			}
		}
	}
	*/
	init(options=null){
		options = this._mergeOptions(DEFAULT_OPTIONS.init, options);
		return new Promise((resolve, reject) => {
			if (this._isInitialized){
				resolve(this.deviceInfo);
				return;
			}
			window.webkit.messageHandlers.arInitAR.postMessage({
				callback: this._createPromiseCallback('init', resolve, reject),
				options: options
			})
		})
	}

	/*
	getData looks into the most recent ARKit data (as received by onWatch) for a key
	returns the key's value or null if it doesn't exist or if a key is not specified it returns all data
	*/
	getData(key=null){
		if (key === null){
			return this._rawARData
		}
		if(this._rawARData && typeof this._rawARData[key] !== 'undefined'){
			return this._rawARData[key]
		}
		return null
	}	

	/*
	Sends a hitTest message to ARKit to get hit testing results
	x, y - screen coordinates normalized to 0..1 (0,0 is at top left and 1,1 is at bottom right)
	types - bit mask of hit testing types
	
	Returns a Promise that resolves to a an object with planes and points (possibly empty) arrays of hit test data:
	{
	points:
		[
			{
				type: 1,							// A packed mask of types ARKitWrapper.HIT_TEST_TYPE_*
				distance: 1.0216870307922363,		// The distance in meters from the camera to the detected anchor or feature point.
				worldTransform:  Matrix4,		// The pose of the hit test result relative to the world coordinate system. 
				localTransform:  Matrix4,		// The pose of the hit test result relative to the nearest anchor or feature point
			},
			...
		]
	plains:
	[
		point: PointData,
		plane: {
			center: Vector3,
			extent: Vector3,
			transform: Matrix4,
			uuid: DOMString
		}
	]
	@see https://developer.apple.com/documentation/arkit/arframe/2875718-hittest
	*/
	hitTest(x, y, types=ARKitWrapper.HIT_TEST_TYPE_ALL){
		return new Promise((resolve, reject) => {
			if (!this._isInitialized){
				reject(new Error('ARKit is not initialized'));
				return;
			}
			window.webkit.messageHandlers.arHitTest.postMessage({
				options: {
					point: {x: x, y: y},
					type: types
				},
				callback: this._createPromiseCallback('hitTest', resolve, reject)
			})
		})
	}

	/*
	Sends an addAnchor message to ARKit
	Returns a promise that returns:
	{
		uuid: DOMString,
		transform - anchor transformation matrix
	}
	*/
	addAnchor(name, transform){
		return new Promise((resolve, reject) => {
			if (!this._isInitialized){
				reject(new Error('ARKit is not initialized'));
				return;
			}
			const options = {
				transform: transform
			}
			if (name !== null) {
				options.name = name
			}
			window.webkit.messageHandlers.arAddAnchor.postMessage({
				options: options,
				callback: this._createPromiseCallback('addAnchor', resolve, reject)
			})
		})
	}

	removeAnchor(uid){
		return new Promise((resolve, reject) => {
			window.webkit.messageHandlers.arRemoveAnchor.postMessage({
				options: {
					uuid: uid
				},
				callback: this._createPromiseCallback('removeAnchor', resolve, reject)
			})
		})
	}
	
	/*
	anchor {
		uuid: DOMString,
		transform - anchor transformation matrix
	}
	*/
	updateAnchor(anchor){
		return new Promise((resolve, reject) => {
			window.webkit.messageHandlers.arUpdateAnchor.postMessage({
				options: {
					anchor: anchor
				},
				callback: this._createPromiseCallback('updateAnchor', resolve, reject)
			})
		})
	}
	
	addRegion(id, center, radius){
		return new Promise((resolve, reject) => {
			if (!center || typeof(center.latitude) != 'number' || 
				typeof(center.longitude) != 'number' || typeof(center.altitude) != 'number'
			) {
				reject(new Error('The center of the region must be specified with its latitude, longitude and altitude'));
				return;
			}
			const region = {
				id: id,
				radius: radius,
				center: {
					latitude: center.latitude,
					longitude: center.longitude,
					altitude: center.altitude
				}
			};
			window.webkit.messageHandlers.arAddRegion.postMessage({
				options: {
					region: region
				},
				callback: this._createPromiseCallback('addRegion', resolve, reject)
			})
		})
	}
	
	removeRegion(id){
		return new Promise((resolve, reject) => {
			window.webkit.messageHandlers.arRemoveRegion.postMessage({
				options: {
					id: id
				},
				callback: this._createPromiseCallback('removeRegion', resolve, reject)
			})
		})
	}
	
	inRegion(id){
		return new Promise((resolve, reject) => {
			window.webkit.messageHandlers.arInRegion.postMessage({
				options: {
					id: id
				},
				callback: this._createPromiseCallback('inRegion', resolve, reject)
			})
		})
	}

	/*
	If this instance is currently watching, send the stopAR message to ARKit to request that it stop sending data on onWatch
	*/
	stop(){
		return new Promise((resolve, reject) => {
			if (!this._isWatching){
				resolve();
				return;
			}
			window.webkit.messageHandlers.arStopAR.postMessage({
				callback: this._createPromiseCallback('stop', resolve, reject)
			})
		})
	}
	
	/*
	If not already watching, send a watchAR message to ARKit to request that it start sending per-frame data to onWatch
	options: the options map for ARKit
		{
			location: {
				accuracy: DOMString
			},
			heading: {
				accuracy: float
			},
			camera: boolean,
			anchors: boolean,
			planes: boolean,
			lightEstimate: boolean
		}
	*/
	watch(options=null){
		if (!this._isInitialized){
			return false
		}
		if(this._isWatching){
			return true
		}
		this._isWatching = true

		options = this._mergeOptions(DEFAULT_OPTIONS.watch, options);
		
		const data = {
			options: options,
			callback: this._globalCallbacksMap.onWatch
		}
		window.webkit.messageHandlers.arWatchAR.postMessage(data)
		return true
	}

	setUIOptions(options){
		options = this._mergeOptions(DEFAULT_OPTIONS.setUIOptions, options);
		return new Promise((resolve, reject) => {
			window.webkit.messageHandlers.arSetUIOptions.postMessage({
				callback: this._createPromiseCallback('setUIOptions', resolve, reject),
				options: options
			})
		})
	}

	loadURL(url){
		window.webkit.messageHandlers.arLoadURL.postMessage({
			options: {url: url}
		})
	}

	_onInit(info){
		this._deviceInfo = info
		this._isInitialized = true
	}

	flattenARMatrix(matrix) {
		return [].concat(
			[matrix.v0.x, matrix.v0.y, matrix.v0.z, matrix.v0.w],
			[matrix.v1.x, matrix.v1.y, matrix.v1.z, matrix.v1.w],
			[matrix.v2.x, matrix.v2.y, matrix.v2.z, matrix.v2.w],
			[matrix.v3.x, matrix.v3.y, matrix.v3.z, matrix.v3.w]
		);
	}

	createARMatrix(matrixArray) {
		const v0 = matrixArray.slice(0, 4);
		const v1 = matrixArray.slice(4, 8);
		const v2 = matrixArray.slice(8, 12);
		const v3 = matrixArray.slice(12, 16);
		return {
			v0: {x: v0[0], y: v0[1], z: v0[2], w: v0[3]},
			v1: {x: v1[0], y: v1[1], z: v1[2], w: v1[3]},
			v2: {x: v2[0], y: v2[1], z: v2[2], w: v2[3]},
			v3: {x: v3[0], y: v3[1], z: v3[2], w: v3[3]}
		}
	}

	/*
	_onWatch is called from native ARKit on each frame:
		data:
		{
			camera: {
				"cameraTransform": {
					v0: {x: number, y: number, z: number, w: number}, - column 0
					v1: {x: number, y: number, z: number, w: number}, - column 1
					v2: {x: number, y: number, z: number, w: number}, - column 2
					v3: {x: number, y: number, z: number, w: number} - column 3
				},
				"projectionCamera": {
					v0: {x: number, y: number, z: number, w: number}, - column 0
					v1: {x: number, y: number, z: number, w: number}, - column 1
					v2: {x: number, y: number, z: number, w: number}, - column 2
					v3: {x: number, y: number, z: number, w: number} - column 3
				}
			},
			location: {
				"altitude": 176.08457946777344,
				"longitude": -79.222516606740456,
				"latitude": 35.789005972772181
			},
			light: {
				ambientIntensity: number,
				ambientColorTemperature: number
			}
		}
	*/
	_onWatch(data){
		this._rawARData = data
		this.dispatchEvent(new CustomEvent(ARKitWrapper.WATCH_EVENT, {
			source: this,
			detail: this._rawARData
		}))
	}

	/*
	Callback from ARKit for when sending per-frame data to onWatch is stopped
	*/
	_onStop(){
		this._isWatching = false
	}

	/*
	The ARKit iOS app depends on several temporal callbacks on `window`. This method sets them up.
	These callbacks are used in promises and are removed after using.
	*/
	_createPromiseCallback(action, resolve, reject){
		const callbackName = this._generateCallbackUID(action);
		window[callbackName] = (data) => {
			delete window[callbackName]
			if (this._isError(data)){
				reject(new Error('ARKit responded with an error code ' + data));
				return;
			}
			const wrapperCallbackName = '_on' + action[0].toUpperCase() +
				action.slice(1);
			if (typeof(this[wrapperCallbackName]) == 'function'){
				this[wrapperCallbackName](data);
			}
			resolve(data)
		}
		return callbackName;
	}

	/*
	Generate unique callback name
	*/
	_generateCallbackUID(prefix){
		return 'arCallback_' + prefix + '_' + new Date().getTime() + 
			'_' + Math.floor((Math.random() * Number.MAX_SAFE_INTEGER))
	}

	_isError(info){
		if (typeof(info) == 'object' || typeof(info) == 'undefined') {
			return false;
		}
		return true;
	}

	/*
	The ARKit iOS app depends on several callbacks on `window`. This method sets them up.
	These callbacks are not removed after using.
	They end up as window.arCallback? where ? is an integer.
	You can map window.arCallback? to ARKitWrapper instance methods using _globalCallbacksMap
	*/
	_generateGlobalCallback(callbackName, num){
		const name = 'arCallback' + num
		this._globalCallbacksMap[callbackName] = name
		const self = this
		window[name] = function(deviceData){
			self['_' + callbackName](deviceData)
		}
	}

	/*
	Merge options passed to some methods with default ones defined by DEFAULT_OPTIONS constant
	*/
	_mergeOptions(defOptions, options){
		options = (options && typeof(options) == 'object') ? options : {}
		options = Object.assign({}, options)
		let result = {}
		for (let key in defOptions) {
			if (typeof(options[key]) == 'undefined') {
				result[key] = defOptions[key];
			} else if (typeof(defOptions[key]) != 'object') {
				result[key] = options[key];
			} else {
				result[key] = this._mergeOptions(defOptions[key], options[key]);
			}
			delete options[key];
		}
		return Object.assign(result, options);
	}
}

// ARKitWrapper event names:
ARKitWrapper.WATCH_EVENT = 'ar-watch'
ARKitWrapper.RECORD_START_EVENT = 'ar-record-start'
ARKitWrapper.RECORD_STOP_EVENT = 'ar-record-stop'
ARKitWrapper.DID_MOVE_BACKGROUND_EVENT = 'ar-did-move-background'
ARKitWrapper.WILL_ENTER_FOREGROUND_EVENT = 'ar-will-enter-foreground'
ARKitWrapper.INTERRUPTION_EVENT = 'ar-interruption'
ARKitWrapper.INTERRUPTION_ENDED_EVENT = 'ar-interruption-ended'
ARKitWrapper.SHOW_DEBUG_EVENT = 'ar-show-debug'
ARKitWrapper.MEMORY_WARNING_EVENT = 'ar-receive-memory-warning'
ARKitWrapper.ENTER_REGION_EVENT = 'ar-enter-region'
ARKitWrapper.EXIT_REGION_EVENT = 'ar-exit-region'
ARKitWrapper.HEADING_UPDATED_EVENT = 'ar-heading-updated'
ARKitWrapper.LOCATION_UPDATED_EVENT = 'ar-location-updated'
ARKitWrapper.TRACKING_CHANGED_EVENT = 'ar-tracking-changed'
ARKitWrapper.SESSION_FAILS_EVENT = 'ar-session-fails'
ARKitWrapper.PLAINS_ADDED_EVENT = 'ar-plains-added'
ARKitWrapper.PLAINS_REMOVED_EVENT = 'ar-plains-removed'
ARKitWrapper.ANCHORS_UPDATED_EVENT = 'ar-anchors-updated'
ARKitWrapper.SIZE_CHANGED_EVENT = 'ar-size-changed'

// hit test types
ARKitWrapper.HIT_TEST_TYPE_FEATURE_POINT = 1
ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE = 8
ARKitWrapper.HIT_TEST_TYPE_ESTIMATED_HORIZONTAL_PLANE = 2
ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_EXTENT = 16

ARKitWrapper.HIT_TEST_TYPE_ALL = ARKitWrapper.HIT_TEST_TYPE_FEATURE_POINT |
	ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE |
	ARKitWrapper.HIT_TEST_TYPE_ESTIMATED_HORIZONTAL_PLANE |
	ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_EXTENT

ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANES = ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE |
	ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_EXTENT

// location accuracies
ARKitWrapper.LOCATION_ACCURACY_BEST_FOR_NAVIGATION = 'BestForNavigation'
ARKitWrapper.LOCATION_ACCURACY_BEST = 'Best'
ARKitWrapper.LOCATION_ACCURACY_NEAREST_TEN_METERS = 'NearestTenMeters'
ARKitWrapper.LOCATION_ACCURACY_HUNDRED_METERS = 'HundredMeters'
ARKitWrapper.LOCATION_ACCURACY_KILOMETER = 'Kilometer'
ARKitWrapper.LOCATION_ACCURACY_THREE_KILOMETERS = 'ThreeKilometers'
