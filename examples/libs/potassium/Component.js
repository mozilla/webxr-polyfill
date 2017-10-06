import EventMixin from './EventMixin.js'
import el from './El.js'

/*
	Component holds the reactive logic for a DOM element
*/
let Component = EventMixin(
	class {
		constructor(dataObject=null, options={}){
			this.dataObject = dataObject // a DataModel or DataCollection
			this.options = options
			this.cleanedUp = false
			if(typeof this.options.el !== 'undefined'){
				this.el = this.options.el
			} else {
				this.el = el.div()
			}
			this.boundCallbacks = [] // { callback, dataObject } to be unbound during cleanup
			this.domEventCallbacks = [] // { callback, eventName, targetEl } to be unregistered during cleanup
			this._el.component = this
		}
		cleanup(){
			if(this.cleanedUp) return
			this.cleanedUp = true
			this.clearListeners()
			for(let bindInfo of this.boundCallbacks){
				bindInfo.dataObject.removeListener(bindInfo.callback)
			}
			for(let domInfo of this.domEventCallbacks){
				domInfo.targetEl.removeEventListener(domInfo.eventName, domInfo.callback)
			}
		}
		// The root DOM element
		get el(){ 
			return this._el
		}
		set el(domElement){
			if(!domElement || domElement.nodeType !== 1){
				throw new Error(`Tried to set a non-DOM element to Component.el: ${domElement}: ${domElement.nodeType}`)
			}
			if(this._el){
				delete this._el['component']
			}
			this._el = domElement
			this._el.component = this
			this.trigger(Component.ElementChangedEvent, this, this._el)
		}
		/*
			Listen to a DOM event.
			For example:
				this.buttonEl = el.button()
				this.listenTo('click', this.buttonEl, this.handleClick)
		*/
		listenTo(eventName, targetEl, callback, context=this){
			let boundCallback = context === null ? callback : callback.bind(context)
			let info = {
				eventName: eventName,
				targetEl: targetEl,
				originalCallback: callback,
				context: context,
				callback: boundCallback
			}
			targetEl.addEventListener(eventName, info.callback)
			this.domEventCallbacks.push(info)
		}
		/*
			Set the targetElement.innerText to the value of dataObject.get(fieldName) as it changes
			dataObject defaults to this.dataObject but can be any DataModel or DataCollection
			formatter defaults to the identity function but can be any function that accepts the value and returns a string
		*/
		bindText(fieldName, targetElement, formatter=null, dataObject=this.dataObject){
			if(formatter === null){
				formatter = (value) => {
					if(value === null) return ''
					if(typeof value === 'string') return value
					return '' + value
				}
			}
			let callback = () => {
				let result = formatter(dataObject.get(fieldName))
				targetElement.innerText = typeof result === 'string' ? result : ''
			}
			dataObject.addListener(callback, `changed:${fieldName}`)
			callback()
			this.boundCallbacks.push({
				callback: callback,
				dataObject: dataObject
			})
		}
		/*
			Set the attributeName attribute of targetElement to the value of dataObject.get(fieldName) as it changes
			formatter defaults to the identity function but can be any function that accepts the value and returns a string
		*/
		bindAttribute(fieldName, targetElement, attributeName, formatter=null, dataObject=this.dataObject){
			if(formatter === null){
				formatter = (value) => {
					if(value === null) return ''
					if(typeof value === 'string') return value
					return '' + value
				}
			}
			let callback = () => {
				targetElement.setAttribute(attributeName, formatter(dataObject.get(fieldName)))
			}
			dataObject.addListener(callback, `changed:${fieldName}`)
			callback()
			this.boundCallbacks.push({
				callback: callback,
				dataObject: dataObject
			})
		}
	}
)

Component.ElementChangeEvent = 'element-changed'

export default Component

