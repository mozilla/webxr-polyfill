import Component from './Component.js'
import DataCollection from './DataCollection.js'
import DataModel from './DataModel.js'
import DataObject from './DataObject.js'
import El from './El.js'
import Router from './Router.js'
import EventListener from './EventListener.js'
import EventMixin from './EventMixin.js'

/*
This is used by webpack to create a single `dist/potassium.js` file for easy inclusion.

You could `import` this file (main.js) as an ES2015 module if you want a global `k` variable as if you loaded `dist/potassium.js`.

If you're using ES2015 modules then you probably should just directly `import` the classes from their individual files in this directory:

	import Component from './potassium/Component.js'
	import DataModel from './potassium/DataModel.js'

*/

let k = {}

k.Component = Component
k.DataCollection = DataCollection
k.DataModel = DataModel
k.el = El
k.Router = Router
k.EventListener = EventListener
k.EventMixin = EventMixin

window.k = k
