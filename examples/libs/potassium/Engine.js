import el from './El.js'

import XRCoordinateSystem from '../../../polyfill/XRCoordinateSystem.js'

/*
Engine wraps up the THREE.Renderer and manages moving into and out of XRSessions
*/
let Engine = class {
	constructor(scene, camera){
		this._render = this._render.bind(this)
		this._el = el.div({ class: 'engine' }) // This will contain the rendering canvas
		this.mode = Engine.FLAT
		this.scene = scene
		this.camera = camera
		this.scene.add(this.camera)

		this.glCanvas = el.canvas().appendTo(this._el)
		this.glContext = this.glCanvas.getContext('webgl')
		if(this.glContext === null){
			throw new Error('Could not create GL context')
		}
		this.renderer = new THREE.WebGLRenderer({
			canvas: this.glCanvas,
			context: this.glContext,
			antialias: false,
			alpha: false
		})
		//this.renderer.autoClear = true

		this.session = null // An XRSession

		setTimeout(this._initRenderer.bind(this), 1000) // TODO HACK!
	}
	get el(){ return this._el }
	setMode(mode){
		if(this.mode === mode) return
		if(Engine.MODES.indexOf(mode) === -1){
			throw new Error('Unknown mode', mode)
		}
		return new Promise((resolve, reject) => {
			if(mode === Engine.FLAT){
				if(this.session !== null){
					this.session.end()
					this.session = null
				}
				this.mode = mode
				resolve(mode)
				return
			}
			if(typeof navigator.XR === 'undefined'){
				reject('XR is not available, so overlay and scenic are not supported')
				return
			}
			navigator.XR.getDisplays().then(displays => {
				if(displays.length == 0) {
					reject('No displays are available')
					return
				}
				if(mode === Engine.OVERLAY){
					var sessionInitParamers = {
						exclusive: false,
						type: XRSession.AUGMENTATION
					}
				} else {
					var sessionInitParamers = {
						exclusive: true,
						type: XRSession.REALITY
					}
				}
				let display = null
				for(let disp of displays){
					if(disp.supportsSession(sessionInitParamers)){
						display = disp
						break
					}
				}
				if(display === null){
					reject('Could not find a display for this type of session')
					return
				}
				if(this.session !== null){
					this.session.end()
					this.session = null
				}
				display.requestSession(sessionInitParamers).then(session => {
					this.session = session
					// Set the session's base layer into which the app will render
					this.session.baseLayer = new XRWebGLLayer(this.session, this.glContext)
					this.session.requestFrame(this._render)
					this.mode = mode
					resolve(mode)
					return
				}).catch(err => {
					console.error('Error requesting session', err)
					reject(err)
				})
			}).catch(err => {
				reject('Error getting XR displays', err)
				return
			})
		})
	}
	_initRenderer(){
		this.renderer.setPixelRatio(1)
		this.renderer.setClearColor('#000', 0)
		window.requestAnimationFrame(this._render)
	}
	_render(frame){
		if(this.session === null){
			window.requestAnimationFrame(this._render)
			this.renderer.setSize(this._el.offsetWidth, this._el.offsetHeight)
			this.renderer.render(this.scene, this.camera)
			return
		}
		this.session.requestFrame(this._render)
		if(typeof frame === 'number') return // This happens when switching from window.requestAnimationFrame to session.requestFrame
		const headPose = frame.getDisplayPose(frame.getCoordinateSystem(XRCoordinateSystem.HEAD_MODEL))
		this.renderer.autoClear = false
		this.renderer.setSize(this.session.baseLayer.framebufferWidth, this.session.baseLayer.framebufferHeight, false)
		this.renderer.clear()
		this.camera.matrixAutoUpdate = false
		// Render each view into this.session.baseLayer.context
		for(const view of frame.views){
			// Each XRView has its own projection matrix, so set the camera to use that
			this.camera.projectionMatrix.fromArray(view.projectionMatrix)
			this.camera.matrix.fromArray(headPose.poseModelMatrix)
			this.camera.updateMatrixWorld(true)
			// Set up the renderer to the XRView's viewport and then render
			this.renderer.clearDepth()
			const viewport = view.getViewport(this.session.baseLayer)
			this.renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height)
			this.renderer.render(this.scene, this.camera)
		}
	}
}

Engine.FLAT = 'flat'
Engine.OVERLAY = 'overlay'
Engine.SCENIC = 'scenic'
Engine.MODES = [Engine.FLAT, Engine.OVERLAY, Engine.SCENIC]

export default Engine
