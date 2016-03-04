/**
 * app Module
 */
stage.registerModule("app", function() {
	
	/**
	 * 
	 */
	var module = function(kernel, config, route) {	
		this.mother = this.$super;
		this.mother.constructor(kernel, config, route);
		this.kernel = kernel;
		
		this.serverSyslog = new stage.syslog();
		this.set( "serverSyslog", this.serverSyslog );
	};
	
	/**
	 * 
	 */
	module.prototype.initialize = function() {
					
		this.logger("INITIALIZE APP", "DEBUG");
		
		try {
			var server = "/nodefony/monitoring/realtime"; 
			this.realtime = new stage.realtime(server ,{
 				onConnect:function(message, realtime){
					//console.log("welcome to realtime " )
				}.bind(this),
				onError:function(code, realtime ,message){
					this.logger("REAlTIME  :" + message,"ERROR")
				}.bind(this),
				onClose:function(){
					//console.log("REALTIME CLOSE");
				},
				onDisconnect:function(){
					//console.log("REALTIME DISCONNECT");
				},
				reConnect:function(){
					//console.log("REALTIME DISCONNECT");	
				}
			});
			this.kernel.set("realtime", this.realtime)
			this.realtime.start();
		}catch(e){
		
		}

		
		
	
	};
			
	return module;		
});
