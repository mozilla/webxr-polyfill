import el from '../../libs/potassium/El.js'
import obj from '../../libs/potassium/Obj.js'
import Engine from '../../libs/potassium/Engine.js'

import ButtonComponent from './ButtonComponent.js'

import Component from '../../libs/potassium/Component.js'

let ModeSwitcherComponent = class extends Component {
	constructor(dataObject=null, options={}){
		super(dataObject, options)
		this.el.addClass('mode-switcher')
		this._mode = null

		this.flatButton = new ButtonComponent(null, { text: 'Flat' })
		this.flatButton.obj.position.set(-0.25, 0, 0)
		this.el.appendChild(this.flatButton.el)
		this.obj.add(this.flatButton.obj)
		this.listenTo('click', this.flatButton.el, ev => {
			this.trigger(ModeSwitcherComponent.ModeChangedEvent, Engine.FLAT)
		})

		this.overlayButton = new ButtonComponent(null, { text: 'Overlay' })
		this.overlayButton.obj.position.set(0, 0, 0)
		this.el.appendChild(this.overlayButton.el)
		this.listenTo('click', this.overlayButton.el, ev => {
			this.trigger(ModeSwitcherComponent.ModeChangedEvent, Engine.OVERLAY)
		})

		this.scenicButton = new ButtonComponent(null, { text: 'Scenic' })
		this.scenicButton.obj.position.set(0.25, 0, 0)
		this.el.appendChild(this.scenicButton.el)
		this.listenTo('click', this.scenicButton.el, ev => {
			this.trigger(ModeSwitcherComponent.ModeChangedEvent, Engine.SCENIC)
		})

		this.setMode(Engine.FLAT)
	}
	setMode(mode){
		if(this._mode === mode) return
		switch(mode){
			case Engine.FLAT:
				this.flatButton.el.addClass('selected')
				this.overlayButton.el.removeClass('selected')
				this.scenicButton.el.removeClass('selected')
				break
			case Engine.OVERLAY:
				this.flatButton.el.removeClass('selected')
				this.overlayButton.el.addClass('selected')
				this.scenicButton.el.removeClass('selected')
				break
			case Engine.SCENIC:
				this.flatButton.el.removeClass('selected')
				this.overlayButton.el.removeClass('selected')
				this.scenicButton.el.addClass('selected')
				break
			default:
				console.error('unknown mode', mode)
				return
		}
		this._mode = mode
	}
}

ModeSwitcherComponent.ModeChangedEvent = 'mode-changed'

export default ModeSwitcherComponent