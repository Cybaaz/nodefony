/*
 *
 *
 *
 *
 *
 */

nodefony.registerService("router", function(){

	/*
 	 *
 	 * CLASS RESOLVER
 	 *
 	 *
 	 */
	var Resolver = function(container, router){
		this.container = container;
		this.router = router ;
		this.resolve = false;
		this.kernel = this.container.get("kernel");
		this.defaultAction = null;
		this.defaultView = null;
		this.variables = new Array();
		this.notificationsCenter = this.container.get("notificationsCenter") ;
		this.context = this.container.get("context") ;
	};

	Resolver.prototype.match = function(route, request){
		//console.log(route)
		var match = route.match(request); 
		if ( match ){
			this.variables = match;
			this.request = request;
			this.route = route;
			this.parsePathernController(route.defaults.controller)
			
		}		
		return match
	};



	var regAction =/^(.+)Action$/; 
	Resolver.prototype.getAction= function(name){
		for (var func in this.controller.prototype){
			if (typeof this.controller.prototype[func] === "function"){
				var res = regAction.exec(func)
				if (res){
					if ( res[1] === name)
						return this.controller.prototype[func]
				}else{
				
				}
			}
		}
		return null;
	};

	Resolver.prototype.parsePathernController = function(name){
		var tab = name.split(":")
		this.bundle = this.kernel.getBundle( this.kernel.getBundleName(tab[0]) );
		if ( this.bundle ){
			if (this.bundle.name !== "framework")
				this.container.set("bundle", this.bundle)
			this.controller = this.getController(tab[1]);
			if ( this.controller ){
				this.action = this.getAction(tab[2]);
				if (! this.action ){
					throw new Error("Resolver :In CONTROLLER: "+ tab[1] +" ACTION  :"+tab[2] + " not exist");
				}
			}else{
				throw new Error("Resolver :controller not exist :"+tab[1] );
			}
			this.defaultView = this.getDefaultView(tab[1], tab[2] );
			this.resolve = true;
		}else{
			throw new Error("Resolver :bundle not exist :"+tab[0] );
		}
	};
	
	Resolver.prototype.getDefaultView = function(controller, action){
		//FIXME .html ???
		var res = this.bundle.name+"Bundle"+":"+controller+":"+action+".html."+this.container.get("templating").extention;
		return res ; 	
	};
	
	Resolver.prototype.getController= function(name){
		if (this.kernel.environment === "dev"){
			this.bundle.reloadController(name);
		}
		return this.bundle.controllers[name];
		
	};

	Resolver.prototype.logger = function(pci, severity, msgid,  msg){
		if (! msgid) msgid = "SERVICE RESOLVER";
		return this.router.syslog.logger(pci, severity, msgid,  msg);
	};

	Resolver.prototype.callController= function(data){
		try {
			var controller = new this.controller( this.container, this.context );
			this.container.set("controller", controller );
			if ( data ){
				this.variables.push(data); 
			}
			var result =  this.action.apply(controller, this.variables);
			switch (true){
				case result instanceof nodefony.Response :
					this.notificationsCenter.fire("onResponse", result, this.context);
				break ;
				case result instanceof nodefony.wsResponse :
					this.notificationsCenter.fire("onResponse", result, this.context);
				break ;
				case result instanceof Promise :
					return result;
				break ;
				case nodefony.typeOf(result) === "object":
					if ( this.defaultView ){
						result = controller.render(this.defaultView, result );
						this.notificationsCenter.fire("onResponse", result, this.context);
					}else{
						throw {
							status:500,
							message:"default view not exist"
						}
					}
				break;
				
				default:
					//this.logger("WAIT ASYNC RESPONSE FOR ROUTE : "+this.route.name ,"DEBUG")
					// CASE async controller wait fire onResponse by other entity
			}
			return result;
		}catch(e){
			throw e;
		}
	};
	nodefony.Resolver = Resolver ;

	/*
 	 *
 	 *
 	 *	ROUTER
 	 *
 	 *
 	 */
	var pluginReader = function(){
		
		var importXmlConfig = function(xml, prefix, callback, parser){
			if (parser){
				xml = this.render(xml, parser.data, parser.options);
			}
			var routes = [];
			this.xmlParser.parseString(xml, function(err, node){
				if(err) this.logger("ROUTER xmlParser.parseString : " + err, 'WARNING');
				if ( ! node ) return node;
				for(var key in node){
					switch(key){
						case 'route': 
							if(prefix){
								for(var skey in node[key]){
									node[key][skey]['id'] = prefix.replace('/', '_') + '_' + node[key][skey]['id'];
									if(node[key][skey]['id'].charAt(0) == '_') node[key][skey]['id'] = node[key][skey]['id'].slice(1);
									node[key][skey]['pattern'] = prefix + node[key][skey]['pattern'];
								}
							}
							routes = routes.concat(node[key]);
							break;
						case 'import':
							
							/*
							 * TODO PROBLEME DE LOAD DE FICHIER: path + getReaderFunc
							 */
							for(var skey in node[key]){
								routes = routes.concat(importXmlConfig.call(this, '/' + node[key][skey]['resource'], (node[key][skey]['prefix'] ? node[key][skey]['prefix'] : '')));
							}
							break;
					}
				}
			}.bind(this));
			if(callback) {
				normalizeXmlJson.call(this, this.xmlToJson.call(this, routes), callback);
			} else {
				return routes;
			}
		};
		
		var normalizeXmlJson = function(routes, callback){
			for(var route in routes){
				for(var param in routes[route]){

					if(['pattern', 'host'].indexOf(param) >= 0){
						routes[route][param] = routes[route][param][0];
					} else {

						if(routes[route][param] instanceof Array){
							var args = {};
							for(var elm=0; elm < routes[route][param].length; elm ++){
								//console.log(routes[route][param][elm])
								//console.log(route)
								for(var sparam in routes[route][param][elm]){
									//console.log(sparam)
									args[sparam] = routes[route][param][elm][sparam];								
								}
							}
							routes[route][param + 's'] = args;
							delete routes[route][param];
						}	
					}
				}
			}
			if(callback) callback(routes);
		};
		
		var getObjectRoutesXML = function(file, callback, parser){
			importXmlConfig.call(this, file, '', callback, parser);
		};
		
		var getObjectRoutesJSON = function(file, callback, parser){
			if (parser){
				file = this.render(file, parser.data, parser.options);
			}
			if(callback) callback(JSON.parse(file)); 
		};
		
		var getObjectRoutesYml = function(file, callback, parser){
			if (parser){
				file = this.render(file, parser.data, parser.options);
			}
			if(callback) callback(yaml.load(file)); 
		};

		return {
			xml:getObjectRoutesXML,
			json:getObjectRoutesJSON,
			yml:getObjectRoutesYml,
			annotation:null
		};
	}();

	var Router = function(container){
		this.container = container ;

		//this.routes = {};
		this.routes = [];
		this.reader = function(context){
			var func = context.container.get("reader").loadPlugin("routing", pluginReader);
			return function(result){
				return func(result, context.nodeReader.bind(context));
			};
		}(this);
		this.engineTemplate = this.container.get("templating");
		this.engineTemplate.extendFunction("path", function(){
			try {
				return this.generatePath.apply(this, arguments);
			}catch(e){
				this.logger(e.error)
				throw {
					status:500,
					error:e.error
				}
			}
		}.bind(this));

		this.syslog = this.container.get("syslog"); 
	};

	Router.prototype.generatePath = function(name, variables, host){
		var route =  this.getRoute(name) ;
		if (! route )
			throw {error:"no route to host  "+ name};
		var path = route.path;
		if ( route.variables.length ){
			if (! variables ){
				var txt = "";
				for (var i= 0 ; i < route.variables.length ;i++ ){
					txt += "{"+route.variables[i]+"} ";
				}
				throw {error:"router generate path route "+ name + " must have variable "+ txt}
			}
			for (var ele in variables ){
				if (ele === "_keys") continue ;
				var index = route.variables.indexOf(ele);
				if ( index >= 0 ){
					path = path.replace("{"+ele+"}",  variables[ele]);
				}else{
					throw {error:"router generate path route "+ name + " don't  have variable "+ ele};
				}	
			}	
		}
		if (host)
			return host+path ;
		return path ;

	};
		
	/*Router.prototype.addRoute = function(name , route){
		if (route instanceof nodefony.Route){
			this.routes[name] = route;
		}else{
			var routeC = this.createRoute(route);
			this.routes[name] = routeC;
		}
		this.logger("ADD Route : "+route.path + "   ===> "+route.defaults.controller, "DEBUG");
	};*/

	Router.prototype.getRoute = function(name){
		if (this.routes[name])
			return this.routes[name];
		this.logger("Route name: "+name +" not exist");
	};

	Router.prototype.setRoute = function(name, route){
		if ( route instanceof nodefony.Route){
			var myroute = route;
		}else{
			var myroute = this.createRoute(route);
		}
		var index = this.routes.push(myroute);
		//var index = this.routes.unshift(myroute);
		if (this.routes[name]){
			this.logger("WARNING ROUTES HAS SAME NAME : "+myroute.path + "   ===> "+myroute.defaults.controller, "WARNING");
		}
		this.routes[name] = this.routes[index-1];
		this.logger("ADD Route : "+myroute.path + "   ===> "+myroute.defaults.controller, "DEBUG");
	};

	Router.prototype.getRoutes = function(name){
		if (name){
			return this.routes[name];
		}
		return this.routes;
	};

	Router.prototype.resolve = function(container, request){
		var resolver = new Resolver(container, this);
		for (var i = 0; i<this.routes.length; i++){
			var route = this.routes[i];
			var res = resolver.match(route, request);
			if (res)
				break;
		}
		return resolver;
	};

	Router.prototype.resolveName = function(container, name){
		var resolver = new Resolver(container, this);	
		var route = resolver.parsePathernController(name);
		return resolver;
	};

	Router.prototype.createRoute = function(obj){
		return new nodefony.Route(obj);
	};

	Router.prototype.logger = function(pci, severity, msgid,  msg){
		//var syslog = this.container.get("syslog");
		if (! msgid) msgid = "SERVICE ROUTER";
		return this.syslog.logger(pci, severity, msgid,  msg);
	};

	Router.prototype.nodeReader = function(obj){
		//console.log(require('util').inspect(obj, {depth: null}));
		for (var route in obj){
			var name = route ;
			var newRoute = new nodefony.Route(route);
			for ( var ele in obj[route] ){
				var arg = obj[route][ele];
				switch ( ele ){
					case "pattern" :
						newRoute.setPattern(arg);
					break;
					case "hostname-pattern" :
						newRoute.setHostname(arg);
						break;					
					case "defaults" :
						for (var ob in arg){
							newRoute.addDefault(ob, arg[ob] );	
						}
					break;
					case "requirements" :
						for (var ob in arg){
							newRoute.addRequirement(ob, arg[ob] );	
						}
					break;
					case "options" :
						for (var ob in arg){
							newRoute.addOptions(ob, arg[ob] );	
						}
					break;
					default:
						this.logger(" Tag : "+ele+ " not exist in routings definition")
				}
			}
			newRoute.compile();
			//this.addRoute(name, newRoute);
			this.setRoute(name, newRoute);
		}
	};	

	return Router;
});
