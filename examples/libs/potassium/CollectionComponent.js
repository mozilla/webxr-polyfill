import el from './El.js'
import Component from './Component.js'
import DataCollection from './DataCollection.js'

/*
DefaultItemComponent is used by CollectionComponent if no itemComponent option is passed
*/
let DefaultItemComponent = class extends Component {
	constructor(dataObject=null, options={}){
		super(dataObject, Object.assign({ el: el.li() }, options))
		if(dataObject === null) throw 'DefaultItemComponent requires a dataObject'
		this.el.appendChild(el.span('Item: ' + dataObject))
	}
}

/*
CollectionComponent provides a generic list UI for DataCollections.
Options:
	itemComponent (DefaultItemComponent): a Component class used to render each item in this list
	itemOptions ({}): a set of options to pass to each item Component
	onClick (null): a function to call with the dataObject whose item Component is clicked
*/
let CollectionComponent = class extends Component {
	constructor(dataObject=null, options={}){
		super(dataObject, options)
		this.el.addClass('collection-component')
		if(dataObject instanceof DataCollection === false) throw 'CollectionComponent requires a DataCollection dataObject'
		this._inGroupChange = false // True while resetting or other group change
		this._dataObjectComponents = new Map() // dataObject.id -> Component

		this._ul = el.ul().appendTo(this.el)

		this.dataObject.addListener((...params) => { this._handleCollectionReset(...params) }, 'reset')
		this.dataObject.addListener((...params) => { this._handleCollectionAdded(...params) }, 'added')
		if(this.dataObject.isNew === false){
			this._handleCollectionReset()
		}
	}
	at(index){
		// Returns the Component at index, or null if index is out of bounds
		if(index < 0) return null
		if(index >= this._ul.children.length) return null
		return this._ul.children.item(index).component
	}
	componentForDataObject(dataObject){
		return this._dataObjectComponents.get(dataObject.get('id'))
	}
	_handleCollectionAdded(eventName, collection, dataObject){
		this._add(this._createItemComponent(dataObject))
	}
	_handleCollectionRemoved(eventName, collection, dataObject){
		let component = this.componentForDataObject(dataObject)
		if(component){
			this._remove(component)
		}
	}
	_handleCollectionReset(eventName, target){
		if(target !== this.dataObject) return // It was a reset for an item in the collection, not the collection itself
		this._inGroupChange = true
		this.trigger(CollectionComponent.Resetting, this)
		for(let [_, itemComponent] of this._dataObjectComponents){
			this._remove(itemComponent)
		}
		this._dataObjectComponents.clear()
		for(let dataObject of this.dataObject){
			this._add(this._createItemComponent(dataObject))
		}
		this._inGroupChange = false
		this.trigger(CollectionComponent.Reset, this)
	}
	_handleItemClick(ev, itemComponent){
		if(this.options.onClick){
			ev.preventDefault()
			this.options.onClick(itemComponent.dataObject)
		}
	}
	_add(itemComponent){
		if(this._dataObjectComponents.get(itemComponent.dataObject.get('id'))){
			// Already have it, ignore the add
			return
		}
		this._dataObjectComponents.set(itemComponent.dataObject.get('id'), itemComponent)
		this._ul.appendChild(itemComponent.el)
		if(this.options.onClick){
			itemComponent.el.addEventListener('click', (ev) => { this._handleItemClick(ev, itemComponent) })
		}
		itemComponent.dataObject.addListener(this._handleDeleted.bind(this), 'deleted', true)
	}
	_remove(itemComponent){
		this._dataObjectComponents.delete(itemComponent.dataObject.get('id'))
		this._ul.removeChild(itemComponent.el)
		itemComponent.el.removeEventListener('click', null)
		itemComponent.cleanup()
	}
	_handleDeleted(eventName, dataObject, error){
		if(error) return
		let component = this._dataObjectComponents.get(dataObject.get('id'))
		if(component){
			this._remove(component)
		}
	}
	_createItemComponent(itemDataObject){
		if(this.options.itemOptions){
			var options = Object.assign({}, this.options.itemOptions)
		} else {
			var options = {}
		}
		if(this.options.itemComponent){
			var itemComponent = this.options.itemComponent(itemDataObject, options)
		} else {
			var itemComponent = new DefaultItemComponent(itemDataObject, options)
		}
		itemComponent.el.addClass('collection-item')
		return itemComponent
	}
}
CollectionComponent.Resetting = 'collection-component-resetting'
CollectionComponent.Reset = 'collection-component-reset'

export default CollectionComponent
