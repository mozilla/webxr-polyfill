import el from '../../libs/potassium/El.js'
import obj from '../../libs/potassium/Obj.js'

import Component from '../../libs/potassium/Component.js'

export default class ButtonComponent extends Component {
	constructor(dataObject=null, options={}){
		super(dataObject, Object.assign({ el: el.button() }, options))
		this._text = ''
		this.buttonObj = obj.obj('./components/models/Button.obj')
		this.obj.add(this.buttonObj)
		this.text = this.options.text || ''
	}

	get text(){ return this._text }

	set text(value){
		this._text = value
		this.el.innerHTML = this._text
		// TODO show text in this.obj
	}

}