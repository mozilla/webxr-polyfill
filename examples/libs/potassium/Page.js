import el from './El.js'
import obj from './Obj.js'
import Router from './Router.js'
import Component from './Component.js'
import EventMixin from './EventMixin.js'

/*
Page contains the orchestration logic for the entirety of what is being displayed for a given page, including the page chrome and both 2D and 3D content.
Page manages mode changes for mixed reality using WebXR, including changes of display, reality, and inputs.
It communicates these changes to Components via events so that they may react. 
*/
let Page = EventMixin(
	class {
		constructor(){
			this._router = new Router()

			// The root DOM element that will contain every Component in the page
			this._el = el.div() 
			this._el.addClass('page')

			// Create the THREE scene, camera, and renderer that will render all 3D elements
			this._scene = obj.scene()					
			this._camera = obj.perspectiveCamera([45, 1, 0.5, 10000]).appendTo(this._scene)
			this._engine = obj.engine(this._scene, this._camera)
		}

		get router(){ return this._router }
		get el(){ return this._el }
		get scene(){ return this._scene }
		get camera(){ return this._camera }
		get engine(){ return this._engine }

		setMode(mode){
			if(this.engine.mode === mode) return
			this.engine.setMode(mode).then(newMode => {
				this._displayMode(newMode)
			}).catch(err => {
				console.error('Error switching mode', err)
			})
		}
	}
)

/*

	Ok, we want the page to manage the display, reality, and input mode switching.
	It should send events down the Component heirarchy, perhaps by traversing the el and obj.
	Somehow it should handle setting up and tearing down XRSessions, and cause the engine to render using the correct RAF.
	State: 
		- display: flat (handling kb&m, touch), overlay (handling kb, touch), in-scene (handling gamepad)

	Components need to react to display and input change events by changing visibility, style, and layout.

	There should be a focus and input manager that translates low level input into higher level semantics using an app-specific schema.

	
*/


export default Page