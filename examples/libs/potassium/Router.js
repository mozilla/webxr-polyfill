import EventMixin from './EventMixin.js'

/*
	Router maps window.history events and URL path fragments to events
	For example, routing /^blog\/([0-9]+)\/page\/([0-9a-z]+)$/ to an event with parameters for blog and page IDs:

		let router = new Router()

		// Set up a couple of routes, each with a URL matching regexs and a route name
		router.addRoute(/^$/, 'default') // matches http://<domain>/<path> and http://<domain>/<path>#
		router.addRoute(/^blog\/([0-9]+)\/page\/([0-9a-z\-]+)$/, 'blog-page') // matches http://<domain>/<path>#blog/1123/page/abc-123

		// Listen for the route
		router.addListener((routeName, hash, ...regexMatches) => {
			// If this was an event triggered by routing to #blog/1123/page/abc-123 then:
			// `routeName` would be 'blog-page'
			// `hash` would be 'blog/1123/page/abc-123'
			// `regexMatches` would be ['1123', 'abc-123']
		}, 'blog-page')
*/
let Router = EventMixin(class {
	constructor(){
		this.cleanedUp = false
		this.routes = [];
		this.hashListener = this._checkHash.bind(this)
        window.addEventListener('hashchange', this.hashListener, false)
	}
	cleanup(){
		if(this.cleanedUp) return
		this.cleanedUp = true
		window.removeEventListener('hashchange', this.hashListener)
		this.clearListeners()
	}
	addRoute(regex, eventName, ...parameters){
		this.routes.push(new Route(regex, eventName, ...parameters))
	}
	start(){
		this._checkHash()
	}
	_checkHash(){
		this._handleNewPath(document.location.hash.slice(1))
	}
	_handleNewPath(path){
		for(let route of this.routes){
			let matches = route.matches(path)
			if(matches == null){
				continue
			}
			this.trigger(route.eventName, ...matches, ...route.parameters)
			return
		}
		this.trigger(Router.UnknownRouteEvent, path)
	}
})

Router.RouteAddedEvent = 'route-added'
Router.StartedRoutingEvent = 'started-routing'
Router.UnknownRouteEvent = 'unknown-route'

export default Router

/*
	Route tracks routes for Router
*/
let Route = class {
	constructor(regex, eventName, ...parameters){
		this.regex = regex
		this.eventName = eventName
		this.parameters = parameters

	}
	matches(path){
		return path.match(this.regex)
	}
}
