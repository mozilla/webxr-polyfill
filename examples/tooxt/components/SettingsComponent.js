import el from '../../libs/potassium/El.js'
import Component from '../../libs/potassium/Component.js'

export default class SettingsComponent extends Component {
	constructor(dataObject=null, options={}){
		super(dataObject, options)
		this.el.appendChild(el.span('Settings'))
	}
}