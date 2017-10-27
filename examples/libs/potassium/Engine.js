import el from './El.js'

/*
Engine wraps up the THREE.Renderer and manages moving into and out of XRSessions
*/
let Engine = class {
	constructor(scene, camera){
		this._boundRender = this._render.bind(this)
		this.mode = Engine.FLAT
		this.scene = scene
		this.camera = camera
		this.scene.add(this.camera)

		this.glCanvas = el.canvas()
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
		this.renderer.autoClear = true
		setTimeout(this._initRenderer.bind(this), 1000) // TODO HACK!
	}
	get el(){
		return this.renderer.domElement
	}
	setMode(mode){
		if(this.mode === mode) return
		if(Engine.MODES.indexOf(mode) === -1){
			console.error('Unknown mode', mode)
			return
		}
		return new Promise((resolve, reject) => {
			this.mode = mode
			resolve(mode)
		})
	}
	_initRenderer(){
		this.renderer.setPixelRatio(1)
		this.renderer.autoClear = false
		this.renderer.setClearColor('#000', 0)
		this.renderer.setSize(this.el.offsetWidth, this.el.offsetHeight)
		window.requestAnimationFrame(this._boundRender)
	}
	_render(){
		window.requestAnimationFrame(this._boundRender)
		this.renderer.render(this.scene, this.camera)
	}
}
Engine.FLAT = 'flat'
Engine.OVERLAY = 'overlay'
Engine.SCENIC = 'scenic'
Engine.MODES = [Engine.FLAT, Engine.OVERLAY, Engine.SCENIC]

export default Engine
