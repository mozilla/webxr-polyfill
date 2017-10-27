import el from '../../libs/potassium/El.js'
import obj from '../../libs/potassium/Obj.js'
import Component from '../../libs/potassium/Component.js'

/*
MainNavComponent renders the main navigation links.
*/
export default class MainNavComponent extends Component {
	constructor(dataObject=null, options={}){
		super(dataObject, options)
		this.el.addClass('main-nav-component')
		this.navEl = el.nav().appendTo(this.el)
		this.siteNameEl = el.a(
			{ href: '#' },
			el.h1('Tooxt')
		).appendTo(this.navEl)

		this.rightLinks = el.ul(
			{ class: 'right-links'},
			el.li(el.a({ href: '#settings' }, 'settings'))
		).appendTo(this.navEl)
	}
	addLink(href, anchorText, className) {
		this.rightLinks.append(el.li(el.a({ 'href': href, 'class': className }, anchorText )))
	}
}
