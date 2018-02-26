import EventHandlerBase from '../fill/EventHandlerBase.js'
import * as glMatrix from "../fill/gl-matrix/common.js";
import * as mat4 from "../fill/gl-matrix/mat4.js";
import * as quat from "../fill/gl-matrix/quat.js";
import * as vec3 from "../fill/gl-matrix/vec3.js";

/*	
ARKitWrapper talks	 to Apple ARKit, as exposed by Mozilla's test ARDemo app.
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
			light_intensity: boolean
		})
	}

*/

export default class ARKitWrapper extends EventHandlerBase {
	constructor(){
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

		this.lightIntensity = 1000;
		/**
     * The current projection matrix of the device.
     * @type {Float32Array}
     * @private
     */
    this.projectionMatrix_ = new Float32Array(16);
    /**
     * The current view matrix of the device.
     * @type {Float32Array}
     * @private
     */
    this.viewMatrix_ = new Float32Array(16);
			/**
		 * The list of planes coming from ARKit.
		 * @type {Map<number, ARPlane}
		 * @private
		 */
		this.planes_ = new Map();

		this.anchors_ = new Map();

		this._globalCallbacksMap = {} // Used to map a window.arkitCallback method name to an ARKitWrapper.on* method name
		// Set up the window.arkitCallback methods that the ARKit bridge depends on
		let callbackNames = ['onInit', 'onWatch']
		for(let i=0; i < callbackNames.length; i++){
			this._generateGlobalCallback(callbackNames[i], i)
		}

		// Set up some named global methods that the ARKit to JS bridge uses and send out custom events when they are called
		let eventCallbacks = [
			['arkitStartRecording', ARKitWrapper.RECORD_START_EVENT],
			['arkitStopRecording', ARKitWrapper.RECORD_STOP_EVENT],
			['arkitDidMoveBackground', ARKitWrapper.DID_MOVE_BACKGROUND_EVENT],
			['arkitWillEnterForeground', ARKitWrapper.WILL_ENTER_FOREGROUND_EVENT],
			['arkitInterrupted', ARKitWrapper.INTERRUPTED_EVENT],
			['arkitInterruptionEnded', ARKitWrapper.INTERRUPTION_ENDED_EVENT], 
			['arkitShowDebug', ARKitWrapper.SHOW_DEBUG_EVENT],
			['arkitWindowResize', ARKitWrapper.WINDOW_RESIZE_EVENT],
			['onError', ARKitWrapper.ON_ERROR],
			['arTrackingChanged', ARKitWrapper.AR_TRACKING_CHANGED]
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
		/**
		 * The result of a raycast into the AR world encoded as a transform matrix.
		 * This structure has a single property - modelMatrix - which encodes the
		 * translation of the intersection of the hit in the form of a 4x4 matrix.
		 * @constructor
		 */
		function VRHit() {
			this.modelMatrix = new Float32Array(16);
			return this;
		};

		var self = this;
		/**
		 * Get an iterable of plane objects representing ARKit's current understanding of the world.
		 * @return {iterator<Object>} The iterable of plane objects.
		 */
		this.getPlanes = function() {
			return Array.from(this.planes_.values());
		};
    /**
     * Get intersection array with planes ARKit detected for the screen coords.
     *
     * @param {number} x The x coordinate in normalized screen space [0,1].
     * @param {number} y The y coordinate in normalized screen space [0,1].
     *
     * @return {!Array<VRHit>} The array of hits sorted based on distance.
     */
		this.hitTestNoAnchor = (function() {
			/**
			* Cached vec3, mat4, and quat structures needed for the hit testing to
			* avoid generating garbage.
			* @type {Object}
			*/
			var hitVars = {
			 rayStart: vec3.create(),
			 rayEnd: vec3.create(),
			 cameraPosition: vec3.create(),
			 cameraQuaternion: quat.create(),	
			 modelViewMatrix: mat4.create(),
			 projectionMatrix: mat4.create(),
			 projViewMatrix: mat4.create(),
			 worldRayStart: vec3.create(),
			 worldRayEnd: vec3.create(),
			 worldRayDir: vec3.create(),
			 planeMatrix: mat4.create(),
			 planeExtent: vec3.create(),
			 planePosition: vec3.create(),
			 planeCenter: vec3.create(),
			 planeNormal: vec3.create(),
			 planeIntersection: vec3.create(),
			 planeIntersectionLocal: vec3.create(),
			 planeHit: mat4.create()
			 //planeQuaternion: quat.create()
		 };
 
		 /**
			* Sets the given mat4 from the given float[16] array.
			*
			* @param {!mat4} m The mat4 to populate with values.
			* @param {!Array<number>} a The source array of floats (must be size 16).
			*/
		 var setMat4FromArray = function(m, a) {
			 mat4.set(
				 m,
				 a[0],
				 a[1],
				 a[2],
				 a[3],
				 a[4],
				 a[5],
				 a[6],
				 a[7],
				 a[8],
				 a[9],
				 a[10],
				 a[11],
				 a[12],
				 a[13],
				 a[14],
				 a[15]
			 );
		 };	
		 /**
			* Tests whether the given ray intersects the given plane.
			*
			* @param {!vec3} planeNormal The normal of the plane.
			* @param {!vec3} planePosition Any point on the plane.
			* @param {!vec3} rayOrigin The origin of the ray.
			* @param {!vec3} rayDirection The direction of the ray (normalized).
			* @return {number} The t-value of the intersection (-1 for none).
			*/
		 var rayIntersectsPlane = (function() {
			 var rayToPlane = vec3.create();
			 return function(planeNormal, planePosition, rayOrigin, rayDirection) {
				 // assuming vectors are all normalized
				 var denom = vec3.dot(planeNormal, rayDirection);
				 vec3.subtract(rayToPlane, planePosition, rayOrigin);
				 return vec3.dot(rayToPlane, planeNormal) / denom;
			 };
		 })();
 
		 /**
			* Sorts based on the distance from the VRHits to the camera.
			*
			* @param {!VRHit} a The first hit to compare.
			* @param {!VRHit} b The second hit item to compare.
			* @returns {number} -1 if a is closer than b, otherwise 1.
			*/
		 var sortFunction = function(a, b) {
			 // Get the matrix of hit a.
			 setMat4FromArray(hitVars.planeMatrix, a.modelMatrix);
			 // Get the translation component of a's matrix.
			 mat4.getTranslation(hitVars.planeIntersection, hitVars.planeMatrix);
			 // Get the distance from the intersection point to the camera.
			 var distA = vec3.distance(
				 hitVars.planeIntersection,
				 hitVars.cameraPosition
			 );
 
			 // Get the matrix of hit b.
			 setMat4FromArray(hitVars.planeMatrix, b.modelMatrix);
			 // Get the translation component of b's matrix.
			 mat4.getTranslation(hitVars.planeIntersection, hitVars.planeMatrix);
			 // Get the distance from the intersection point to the camera.
			 var distB = vec3.distance(
				 hitVars.planeIntersection,
				 hitVars.cameraPosition
			 );
 
			 // Return comparison of distance from camera to a and b.
			 return distA < distB ? -1 : 1;
		 };
 
		 return function(x, y) {
			 // Coordinates must be in normalized screen space.
			 if (x < 0 || x > 1 || y < 0 || y > 1) {
				 throw new Error(
						 "hitTest - x and y values must be normalized [0,1]!")
				 ;
			 }
 
			 var hits = [];
			 // If there are no anchors detected, there will be no hits.
			 var planes = this.getPlanes();
			 if (!planes || planes.length == 0) {
				 return hits;
			 }
 
			 // Create a ray in screen space for the hit test ([-1, 1] with y flip).
			 vec3.set(hitVars.rayStart, 2 * x - 1, 2 * (1 - y) - 1, 0);
			 vec3.set(hitVars.rayEnd, 2 * x - 1, 2 * (1 - y) - 1, 1);
			 // Set the projection matrix.
			 setMat4FromArray(hitVars.projectionMatrix, self.projectionMatrix_);
 
			 // Set the model view matrix.
			 setMat4FromArray(hitVars.modelViewMatrix, self.viewMatrix_);
 
			 // Combine the projection and model view matrices.
			 mat4.multiply(
				 hitVars.projViewMatrix,
				 hitVars.projectionMatrix,
				 hitVars.modelViewMatrix
			 );
			 // Invert the combined matrix because we need to go from screen -> world.
			 mat4.invert(hitVars.projViewMatrix, hitVars.projViewMatrix);
 
			 // Transform the screen-space ray start and end to world-space.
			 vec3.transformMat4(
				 hitVars.worldRayStart,
				 hitVars.rayStart,
				 hitVars.projViewMatrix
			 );
			 vec3.transformMat4(
				 hitVars.worldRayEnd,
				 hitVars.rayEnd,
				 hitVars.projViewMatrix
			 );
 
			 // Subtract start from end to get the ray direction and then normalize.
			 vec3.subtract(
				 hitVars.worldRayDir,
				 hitVars.worldRayEnd,
				 hitVars.worldRayStart
			 );
			 vec3.normalize(hitVars.worldRayDir, hitVars.worldRayDir);
 
			 // Go through all the anchors and test for intersections with the ray.
			 for (var i = 0; i < planes.length; i++) {
				 var plane = planes[i];
				 // Get the anchor transform.
				 setMat4FromArray(hitVars.planeMatrix, plane.modelMatrix);
 
				 // Get the position of the anchor in world-space.
				 vec3.set(
					 hitVars.planeCenter,
					 0,
					 0,
					 0
				 );
				 vec3.transformMat4(
					 hitVars.planePosition,
					 hitVars.planeCenter,
					 hitVars.planeMatrix
				 );
 
				 // Get the plane normal.
				 // TODO: use alignment to determine this.
				 vec3.set(hitVars.planeNormal, 0, 1, 0);
 
				 // Check if the ray intersects the plane.
				 var t = rayIntersectsPlane(
					 hitVars.planeNormal,
					 hitVars.planePosition,
					 hitVars.worldRayStart,
					 hitVars.worldRayDir
				 );
 
				 // if t < 0, there is no intersection.
				 if (t < 0) {
					 continue;
				 }
 
				 // Calculate the actual intersection point.
				 vec3.scale(hitVars.planeIntersection, hitVars.worldRayDir, t);
				 vec3.add(
					 hitVars.planeIntersection,
					 hitVars.worldRayStart,
					 hitVars.planeIntersection
				 );
				 // Get the plane extents (extents are in plane local space).
				 vec3.set(hitVars.planeExtent, plane.extent[0], 0, plane.extent[1]);
 
				 /*
					 ///////////////////////////////////////////////
					 // Test by converting extents to world-space.
					 // TODO: get this working to avoid matrix inversion in method below.
 
					 // Get the rotation component of the anchor transform.
					 mat4.getRotation(hitVars.planeQuaternion, hitVars.planeMatrix);
 
					 // Convert the extent into world space.
					 vec3.transformQuat(
					 hitVars.planeExtent, hitVars.planeExtent, hitVars.planeQuaternion);
 
					 // Check if intersection is outside of the extent of the anchor.
					 if (Math.abs(hitVars.planeIntersection[0] - hitVars.planePosition[0]) > hitVars.planeExtent[0] / 2) {
					 continue;
					 }
					 if (Math.abs(hitVars.planeIntersection[2] - hitVars.planePosition[2]) > hitVars.planeExtent[2] / 2) {
					 continue;
					 }
					 ////////////////////////////////////////////////
					 */
 
				 ////////////////////////////////////////////////
				 // Test by converting intersection into plane-space.
				 mat4.invert(hitVars.planeMatrix, hitVars.planeMatrix);
				 vec3.transformMat4(
					 hitVars.planeIntersectionLocal,
					 hitVars.planeIntersection,
					 hitVars.planeMatrix
				 );
 
				 // Check if intersection is outside of the extent of the anchor.
				 // Tolerance is added to match the behavior of the native hitTest call.
				 var tolerance = 0.0075;
				 if (
					 Math.abs(hitVars.planeIntersectionLocal[0]) >
					 hitVars.planeExtent[0] / 2 + tolerance
				 ) {
					 continue;
				 }
				 if (
					 Math.abs(hitVars.planeIntersectionLocal[2]) >
					 hitVars.planeExtent[2] / 2 + tolerance
				 ) {
					 continue;
				 }
 
				 ////////////////////////////////////////////////
 
				 // The intersection is valid - create a matrix from hit position.
				 mat4.fromTranslation(hitVars.planeHit, hitVars.planeIntersection);
				var hit = new VRHit();
				 for (var j = 0; j < 16; j++) {
					 hit.modelMatrix[j] = hitVars.planeHit[j];
				 }
				 hit.i = i;
				 hits.push(hit);
			 }
 
			 // Sort the hits by distance.
			 hits.sort(sortFunction);
			 return hits;
		 };

		 })();
	}

	static GetOrCreate(options=null){
		if(typeof ARKitWrapper.GLOBAL_INSTANCE === 'undefined'){
			ARKitWrapper.GLOBAL_INSTANCE = new ARKitWrapper()
			options = (options && typeof(options) == 'object') ? options : {}
			let defaultUIOptions = {
				browser: true,
				points: true,
				focus: false,
				rec: true,
				rec_time: true,
				mic: false,
				build: false,
				plane: true,
				warnings: true,
				anchors: false,
				debug: true,
				statistics: false
			}
			let uiOptions = (typeof(options.ui) == 'object') ? options.ui : {}
			options.ui = Object.assign(defaultUIOptions, uiOptions)
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
			const callback = () => {
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
	returns
		{
			uuid: DOMString,
			transform: [4x4 column major affine transform]
		}

	return null if object with `uuid` is not found
	*/
	getObject(uuid){
		if (!this._isInitialized){
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
	x, y - screen coordinates normalized to 0..1 (0,0 is at top left and 1,1 is at bottom right)
	types - bit mask of hit testing types
	
	Returns a Promise that resolves to a (possibly empty) array of hit test data:
	[
		{
			type: 1,							// A packed mask of types ARKitWrapper.HIT_TEST_TYPE_*
			distance: 1.0216870307922363,		// The distance in meters from the camera to the detected anchor or feature point.
			world_transform:  [float x 16],		// The pose of the hit test result relative to the world coordinate system. 
			local_transform:  [float x 16],		// The pose of the hit test result relative to the nearest anchor or feature point

			// If the `type` is `HIT_TEST_TYPE_ESTIMATED_HORIZONTAL_PLANE`, `HIT_TEST_TYPE_EXISTING_PLANE`, or `HIT_TEST_TYPE_EXISTING_PLANE_USING_EXTENT` (2, 8, or 16) it will also have anchor data:
			anchor_center: { x:float, y:float, z:float },
			anchor_extent: { x:float, y:float },
			uuid: string,

			// If the `type` is `HIT_TEST_TYPE_EXISTING_PLANE` or `HIT_TEST_TYPE_EXISTING_PLANE_USING_EXTENT` (8 or 16) it will also have an anchor transform:
			anchor_transform: [float x 16]
		},
		...
	]
	@see https://developer.apple.com/documentation/arkit/arframe/2875718-hittest
	*/
	hitTest(x, y, types=ARKitWrapper.HIT_TEST_TYPE_ALL){
		return new Promise((resolve, reject) => {
			if (!this._isInitialized){
				reject(new Error('ARKit is not initialized'));
				return;
			}
			window.webkit.messageHandlers.hitTest.postMessage({
				x: x,
				y: y,
				type: types,
				callback: this._createPromiseCallback('hitTest', resolve)
			})
		})
	}

	/*
	Sends an addAnchor message to ARKit
	Returns a promise that returns:
	{
		uuid - the anchor's uuid,
		transform - anchor transformation matrix
	}
	*/
	addAnchor(uid, transform){
		return new Promise((resolve, reject) => {
			if (!this._isInitialized){
				reject(new Error('ARKit is not initialized'));
				return;
			}
			window.webkit.messageHandlers.addAnchor.postMessage({
				uuid: uid,
				transform: transform,
				callback: this._createPromiseCallback('addAnchor', resolve)
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
			console.log('----STOP');
			window.webkit.messageHandlers.stopAR.postMessage({
				callback: this._createPromiseCallback('stop', resolve)
			})
		})
	}
	
	/*
	If not already watching, send a watchAR message to ARKit to request that it start sending per-frame data to onWatch
	options: the options map for ARKit
		{
			location: boolean,
			camera: boolean,
			objects: boolean,
			light_intensity: boolean
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

		if(options === null){
			options = {
				location: true,
				camera: true,
				objects: true,
				light_intensity: true
			}
		}
		
		const data = {
			options: options,
			callback: this._globalCallbacksMap.onWatch
		}
		console.log('----WATCH');
		window.webkit.messageHandlers.watchAR.postMessage(data)
		return true
	}

	/*
	Sends a setUIOptions message to ARKit to set ui options (show or hide ui elements)
	options: {
		browser: boolean,
		points: boolean,
		focus: boolean,
		rec: boolean,
		rec_time: boolean,
		mic: boolean,
		build: boolean,
		plane: boolean,
		warnings: boolean,
		anchors: boolean,
		debug: boolean,
		statistics: boolean
	}
	*/
	setUIOptions(options){
		window.webkit.messageHandlers.setUIOptions.postMessage(options)
	}

	/*
	Called during instance creation to send a message to ARKit to initialize and create a device ID
	Usually results in ARKit calling back to _onInit with a deviceId
	options: {
		ui: {
			browser: boolean,
			points: boolean,
			focus: boolean,
			rec: boolean,
			rec_time: boolean,
			mic: boolean,
			build: boolean,
			plane: boolean,
			warnings: boolean,
			anchors: boolean,
			debug: boolean,
			statistics: boolean
		}
	}
	*/
	_sendInit(options){
		// get device id
		console.log('----INIT');
		window.webkit.messageHandlers.initAR.postMessage({
			options: options,
			callback: this._globalCallbacksMap.onInit
		})
	}

	/*
	Callback for when ARKit is initialized
	deviceId: DOMString with the AR device ID
	*/
	_onInit(deviceId){
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
	_onWatch(data){
		this._rawARData = data
		this.dispatchEvent(new CustomEvent(ARKitWrapper.WATCH_EVENT, {
			source: this,
			detail: this._rawARData
		}))

		this.lightIntensity = data.light_intensity;
		this.viewMatrix_ = data.camera_view;
		this.projectionMatrix_ = data.projection_camera;

		if(data.newObjects.length){
			for (let i = 0; i < data.newObjects.length; i++) {
				const element = data.newObjects[i];
				if(element.h_plane_center){
					this.planes_.set(element.uuid, {
						id: element.uuid,
						center: element.h_plane_center,
						extent: [element.h_plane_extent.x, element.h_plane_extent.z],
						modelMatrix: element.transform
					});
				}else{
					this.anchors_.set(element.uuid, {
						id: element.uuid,
						modelMatrix: element.transform
					});
				}
			}
		}

		if(data.removedObjects.length){
			for (let i = 0; i < data.removedObjects.length; i++) {
				const element = data.removedObjects[i];
				if(element.h_plane_center){
					this.planes_.delete(element.uuid);
				}else{
					this.anchors_.delete(element.uuid);
				}
			}
		}

		if(data.objects.length){
			for (let i = 0; i < data.objects.length; i++) {
				const element = data.objects[i];
				if(element.h_plane_center){
					var plane = this.planes_.get(element.uuid);
					if(!plane){
						this.planes_.set(element.uuid, {
							id: element.uuid,
							center: element.h_plane_center,
							extent: [element.h_plane_extent.x, element.h_plane_extent.z],
							modelMatrix: element.transform
						});
					} else {
						plane.center = element.h_plane_center;
						plane.extent = [element.h_plane_extent.x, element.h_plane_extent.z];
						plane.transform = element.transform;
					}
				}else{
					var anchor = this.anchors_.get(element.uuid);
					if(!anchor){
						this.anchors_.set(element.uuid, {
							id: element.uuid,
							modelMatrix: element.transform
						});
					}else{
						anchor.transform = element.transform;
					}
				}
			}
		}
	}

	/*
	Callback from ARKit for when sending per-frame data to onWatch is stopped
	*/
	_onStop(){
		this._isWatching = false
	}

	_createPromiseCallback(action, resolve){
		const callbackName = this._generateCallbackUID(action);
		window[callbackName] = (data) => {
			delete window[callbackName]
			const wrapperCallbackName = '_on' + action[0].toUpperCase() +
				action.slice(1);
			if (typeof(this[wrapperCallbackName]) == 'function'){
				this[wrapperCallbackName](data);
			}
			resolve(data)
		}
		return callbackName;
	}

	_generateCallbackUID(prefix){
		return 'arkitCallback_' + prefix + '_' + new Date().getTime() + 
			'_' + Math.floor((Math.random() * Number.MAX_SAFE_INTEGER))
	}

	/*
	The ARKit iOS app depends on several callbacks on `window`. This method sets them up.
	They end up as window.arkitCallback? where ? is an integer.
	You can map window.arkitCallback? to ARKitWrapper instance methods using _globalCallbacksMap
	*/
	_generateGlobalCallback(callbackName, num){
		const name = 'arkitCallback' + num
		this._globalCallbacksMap[callbackName] = name
		const self = this
		window[name] = function(deviceData){
			self['_' + callbackName](deviceData)
		}
	}
}

// ARKitWrapper event names:
ARKitWrapper.INIT_EVENT = 'arkit-init'
ARKitWrapper.WATCH_EVENT = 'arkit-watch'
ARKitWrapper.RECORD_START_EVENT = 'arkit-record-start'
ARKitWrapper.RECORD_STOP_EVENT = 'arkit-record-stop'
ARKitWrapper.DID_MOVE_BACKGROUND_EVENT = 'arkit-did-move-background'
ARKitWrapper.WILL_ENTER_FOREGROUND_EVENT = 'arkit-will-enter-foreground'
ARKitWrapper.INTERRUPTED_EVENT = 'arkit-interrupted'
ARKitWrapper.INTERRUPTION_ENDED_EVENT = 'arkit-interruption-ended'
ARKitWrapper.SHOW_DEBUG_EVENT = 'arkit-show-debug'
ARKitWrapper.WINDOW_RESIZE_EVENT = 'arkit-window-resize'
ARKitWrapper.ON_ERROR = 'on-error'
ARKitWrapper.AR_TRACKING_CHANGED = 'ar_tracking_changed'

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
