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
		this.el.appendChild(this.flatButton.el)
		this.obj.add(this.flatButton.obj)
		this.listenTo('click', this.flatButton.el, ev => {
			this.trigger(ModeSwitcherComponent.ModeChangedEvent, Engine.FLAT)
		})

		this.overlayButton = el.button({ type: 'button' }, 'Overlay').appendTo(this.el)
		this.listenTo('click', this.overlayButton, ev => {
			this.trigger(ModeSwitcherComponent.ModeChangedEvent, Engine.OVERLAY)
		})
		this.scenicButton = el.button({ type: 'button' }, 'Scenic').appendTo(this.el)
		this.listenTo('click', this.scenicButton, ev => {
			this.trigger(ModeSwitcherComponent.ModeChangedEvent, Engine.SCENIC)
		})

		this.setMode(Engine.FLAT)
	}
	setMode(mode){
		if(this._mode === mode) return
		switch(mode){
			case Engine.FLAT:
				this.flatButton.el.addClass('selected')
				this.overlayButton.removeClass('selected')
				this.scenicButton.removeClass('selected')
				break
			case Engine.OVERLAY:
				this.flatButton.el.removeClass('selected')
				this.overlayButton.addClass('selected')
				this.scenicButton.removeClass('selected')
				break
			case Engine.SCENIC:
				this.flatButton.el.removeClass('selected')
				this.overlayButton.removeClass('selected')
				this.scenicButton.addClass('selected')
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