import el from '../../libs/potassium/El.js'
import obj from '../../libs/potassium/Obj.js'

import Component from '../../libs/potassium/Component.js'

export default class ButtonComponent extends Component {
	constructor(dataObject=null, options={}){
		super(dataObject, Object.assign({ el: el.button() }, options))
		this._text = options.text || ''
		this.el.innerHTML = this._text
		this.obj = obj.obj('./models/Button.obj')
	}

	set text(value){

	}

}