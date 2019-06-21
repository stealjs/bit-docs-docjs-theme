var makeDocMapInfo = require("./doc-map-info");
var unescapeHTML = require("unescape-html");

module.exports = function(docMap, config, getCurrent, oldHelpers, OtherHandlebars){
	var docMapInfo = makeDocMapInfo(docMap);

	var lastPartOfName = function(str){
		var lastIndex = Math.max( str.lastIndexOf("/"), str.lastIndexOf(".") );
		// make sure there is at least a character
		if(lastIndex > 0){
			return str.substr(lastIndex+1);
		}
		return str;
	};

	var esc = function (content) {
		// Convert bad values into empty strings
		var isInvalid = content === null || content === undefined || (isNaN(content) && ("" + content === 'NaN'));
		return ( "" + ( isInvalid ? '' : content ) )
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(strQuote, '&#34;')
			.replace(strSingleQuote, "&#39;");
	};

	var strQuote = /"/g;
	var strSingleQuote = /'/g;

	var sortChildren = function(child1, child2){
		// put groups at the end
		if(/group|prototype|static/i.test(child1.type)){
			if(!/group|prototype|static/i.test(child2.type)){
				return 1;
			} else {
				if(child1.type === "prototype"){
					return -1;
				}
				if(child2.type === "prototype"){
					return 1;
				}
				if(child1.type === "static"){
					return -1;
				}
				if(child2.type === "static"){
					return 1;
				}
			}
		}
		if(/prototype|static/i.test(child2.type)){
			return -1;
		}

		if(typeof child1.order == "number"){
			if(typeof child2.order == "number"){
				// same order given?
				if(child1.order == child2.order){
					// sort by name
					if(child1.name < child2.name){
						return -1;
					}
					return 1;
				} else {
					return child1.order - child2.order;
				}

			} else {
				return -1;
			}
		} else {
			if(typeof child2.order == "number"){
				return 1;
			} else {
				// alphabetical
				if(child1.name < child2.name){
					return -1;
				}
				return 1;
			}
		}
	};

	function getSourceFilePath(docObject) {
		var source = docObject.src;

		if (typeof source === "string") {
			return source;
		} else {
			return source ? source.path : "";
		}
	}

	// GENERIC HELPERS
	var helpers = {
		makeChildrenContext: function(docObject) {
			var children = docMapInfo.getChildren(docObject) || [];
			return { children: children };
		},

		/**
		 * @function documentjs.generators.html.defaultHelpers.ifEqual
		 */
		ifEqual: function( first, second, options ) {
			if(first == second){
				return options.fn(this);
			} else {
				return options.inverse(this);
			}
		},
		/**
		 * @function documentjs.generators.html.defaultHelpers.ifAny
		 */
		ifAny: function(){
			var last = arguments.length -1,
				options = arguments[last];
				for(var i = 0 ; i < last; i++) {
					if(arguments[i]) {
						return options.fn(this);
					}
				}
				return options.inverse(this);
		},
		/**
		 * @function documentjs.generators.html.defaultHelpers.ifNotEqual
		 */
		ifNotEqual: function( first, second, options ) {
			if(first !== second){
				return options.fn(this);
			} else {
				return options.inverse(this);
			}
		},

		config: function(){
			var Copy = {};
			for(var prop in config){
				if(typeof [prop] !== "function"){
					Copy[prop] = [prop];
				}
			}
			return JSON.stringify(Copy);
		},

		/**
		 * @function documentjs.generators.html.defaultHelpers.generatedWarning
		 * @signature `{{{generatedWarning}}}`
		 *
		 * @body
		 *
		 * ## Use
		 * ```
		 * {{{generatedWarning}}}
		 * ```
		 * MUST use triple-braces to escape HTML so it is hidden in a comment.
		 *
		 * Creates a warning that looks like this:
		 *
		 * ```
		 * <!--####################################################################
		 * THIS IS A GENERATED FILE -- ANY CHANGES MADE WILL BE OVERWRITTEN
		 *
		 * INSTEAD CHANGE:
		 * source: lib/tags/iframe.js
		 * @@constructor documentjs.tags.iframe
		 * ######################################################################## -->
		 * ```
		 */
		generatedWarning: function(){
			var current = getCurrent();
			var source = getSourceFilePath(current);

			return (
				"<!--####################################################################\n" +
					"\tTHIS IS A GENERATED FILE -- ANY CHANGES MADE WILL BE OVERWRITTEN\n\n" +
					"\tINSTEAD CHANGE:\n" +
					"\tsource: " + source +
					(current.type ? "\n\t@" + current.type + " " + current.name : "") +
				"\n######################################################################## -->"
			);
		},

		getParentsPathToSelf: function(name){
			var names = {};

			// walk up parents until you don't have a parent
			var parent = docMap[name];
			var parents = [];

			// don't allow things that are their own parent
			if (parent.parent === name){
				return parents;
			}

			while(parent){
				parents.unshift(parent);
				if (names[parent.name]){
					return parents;
				}
				names[parent.name] = true;
				parent = docMap[parent.parent];
			}

			return parents;
		},

		googleAnalyticsTrackingCode: function() {
			return config.googleAnalyticsTrackingCode;
		},

		/**
		 * @function documentjs.generators.html.defaultHelpers.makeTitle
		 * Given the docObject context, returns a "pretty" name that is used
		 * in the sidebar and the page header.
		 */
		makeTitle: function () {
			var node = this;

			if (node.title) {
				return node.title;
			}

			var title = "";

			// name: "cookbook/recipe/list.static.defaults"
			// parent: "cookbook/recipe/list.static"
			// src: "cookbook/recipe/list/list.js"
			var parentParent = docMap[node.parent] && docMap[node.parent].parent;
			// check if we can replace with our parent
			if(node.name.indexOf(node.parent + ".") === 0){
				node.name.replace(node.parent + ".", "");
			} else if(parentParent && parentParent.indexOf(".") > 0 && node.name.indexOf(parentParent + ".") === 0){
				// try with our parents parent
				node.name.replace(parentParent + ".", "");
			} else {
				title = node.name;
			}

			return title;
		},

		/**
		 * @function documentjs.generators.html.defaultHelpers.ifGroup
		 * Renders the section if the current context is a group type like
		 * "group", "prototype", or "static".
		 */
		ifGroup: function(options){
			if(/group|prototype|static/i.test(this.type)){
				return options.fn(this);
			} else {
				return options.inverse(this);
			}
		},
		/**
		 * @function documentjs.generators.html.defaultHelpers.makeParamsString
		 * @hide
		 *
		 * Given the parameters of a function valueData object, create a string that
		 * represents the arguments.
		 *
		 * @param {Array<documentjs.process.valueData>} params
		 *
		 */
		makeParamsString: function(params){
			if(!params || !params.length){
				return "";
			}
			return params.map(function(param){
				// try to look up the title
				var type = param.types && param.types[0] && param.types[0].type;
				return oldHelpers.linkTo(type, param.name) +
					( param.variable ? "..." : "" );
			}).join(", ");
		},
		/**
		 * @function documentjs.generators.html.defaultHelpers.makeType
		 * @hide
		 *
		 * Given an invidual type object, create something that represents it.
		 *
		 * @param {Array<documentjs.process.typeData>} t
		 *
		 */
		makeType: function (t) {
			if(t.type === "function"){
				var fn = "("+helpers.makeParamsString(t.params)+")";

				if(t.constructs && t.constructs.types){
					fn = "constructor"+fn;
					fn += " => "+helpers.makeTypes(t.constructs.types);
				} else {
					fn = "function"+fn;
				}

				return fn;
			}
			var params;
			var type = docMap[t.type];
			var title = type && type.title || undefined;
			var txt = oldHelpers.linkTo(t.type, title);

			if(t.template && t.template.length){
				txt += "&lt;"+t.template.map(function(templateItem){
					return helpers.makeTypes(templateItem.types);
				}).join(",")+"&gt;";
			}
			if(type){
				if(type.type === "function" && (type.params || type.signatures)){
					params = type.params || (type.signatures[0] && type.signatures[0].params ) || [];
				} else if(type.type === "typedef" && type.types[0] && type.types[0].type == "function"){
					params = type.types[0].params;
				}
				if(params){
					txt += "("+helpers.makeParamsString(params)+")";
				}
			}

			return txt;
		},
		makeTypes: function(types){
			if (types.length) {
				// turns [{type: 'Object'}, {type: 'String'}] into '{Object | String}'
				return types.map(helpers.makeType).join(' | ');
			} else {
				return '';
			}
		},
		/**
		 * @function documentjs.generators.html.defaultHelpers.makeTypesString
		 *
		 * Converts an array of [documentjs.process.typeData typeData]
		 * to a readable string surrounded by {}.
		 *
		 * @param {Array<documentjs.process.typeData>} types
		 *
		 * @return {String}
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * Example:
		 *
		 *     {{makeTypesString types}}
		 *
		 * Where types looks like:
		 *
		 *     [{type: 'Object'}, {type: 'String'}]
		 *
		 * Produces:
		 *
		 *     '{Object | String}'
		 */
		makeTypesString: function (types) {
			if (types && types.length) {
				// turns [{type: 'Object'}, {type: 'String'}] into '{Object | String}'
				var txt = "{"+helpers.makeTypes(types);
				//if(this.defaultValue){
				//	txt+="="+this.defaultValue
				//}
				return txt+"}";
			} else {
				return '';
			}
		},

		/**
		 * @function documentjs.generators.html.defaultHelpers.urlTest
		 *
		 * Returns the url for the docObject's test
		 */
		urlTest: function (docObject) {
			// TODO we know we're in the docs/ folder for test links but there might
			// be a more flexible way for doing this
			return '../' + docObject.test;
		},

		// Getting and transforming data and making it available to the template
		/**
		 * @function documentjs.generators.html.defaultHelpers.getTypesWithDescriptions
		 */
		getTypesWithDescriptions: function(types, options){
			if(!Array.isArray(types)) {
				return options.inverse(this);
			}
			var typesWithDescriptions = [];
			types.forEach(function( type ){
				if(type.description){
					typesWithDescriptions.push(type);
				}
			});

			if( !typesWithDescriptions.length ) {
				// check the 1st one's options
				if(types.length == 1 && types[0].options ) {
					types[0].options.forEach(function(option){
						typesWithDescriptions.push(option);
					});
				}

			}

			if(typesWithDescriptions.length){
				return options.fn({types: typesWithDescriptions});
			} else {
				return options.inverse(this);
			}
		},
		/**
		 * @function documentjs.generators.html.defaultHelpers.getActiveAndParents
		 *
		 * Renders its sub-section with a `parents` array of docObjects and the
		 * last parent menu as the "active" item.
		 *
		 * @body
		 *
		 * ## Use
		 *
		 * Call it in your template like:
		 *
		 *     {{#getActiveAndParents}}
		 *       {{#each parents}}
		 *       {{/each}}
		 *       {{#active}}
		 *       {{/active}}
		 *     {{/getActiveAndParents}}
		 *
		 * where `parents` is each parent docObject of the `current` docObject and
		 * `active` is the first docObject of current that has children.
		 */
		getActiveAndParents: function(options) {
			var parents = helpers.getParentsPathToSelf(getCurrent().name);
			var	active = parents.pop();

			if (active) {
				var children = docMapInfo.getChildren(active) || [];

				if (!children.length && parents.length) {
					// we want to show this item along-side its siblings
					// make its parent active
					active = parents.pop();

					// if the original active was in a group, prototype, etc, move up again
					if (parents.length && /group|prototype|static/i.test(active.type)) {
						active = parents.pop();
					}
				}
			} else {
				// there are no parents, possibly nothing active
				parents = [];
				active = docMap[config.parent];
			}

			// remove groups because we don't want them showing up
			parents = parents.filter(function(parent) {
				return parent.type !== 'group';
			});

			// Make sure root is always here
			if (active.name !== config.parent &&
				(!parents.length || parents[0].name !== config.parent)) {
				parents.unshift(docMap[config.parent]);
			}

			return options.fn({ parents: parents, active: active });
		},
		/**
		 * @function documentjs.generators.html.defaultHelpers.eachFirstLevelChildren
		 *
		 * Goes through the parent object's children.
		 */
		eachFirstLevelChildren: function( options ){
			var res = "";
			(docMap[config.parent].children || []).sort(sortChildren).forEach(function(item){
				res += options.fn(item);
			});
			return res;
		},
		/**
		 * @function documentjs.generators.html.defaultHelpers.eachOrderedChildren
		 *
		 * Goes through each `children` in the sorted order.
		 */
		eachOrderedChildren: function(children, options) {
			children = (children || []).slice(0).sort(sortChildren);
			var res = "";
			children.forEach(function(child){
				res += options.fn(child);
			});
			return res;
		},
		// If the current docObject is something
		/**
		 * @function documentjs.generators.html.defaultHelpers.ifActive
		 *
		 * Renders the truthy section if the current item's name matches
		 * the current docObject being rendered
		 *
		 * @param {HandlebarsOptions} options
		 */
		ifActive: function(options){
			if(this.name == getCurrent().name){
				return options.fn(this);
			} else {
				return options.inverse(this);
			}
		},
		// helpers for 2nd layout type
		/**
		 * @function documentjs.generators.html.defaultHelpers.ifHasActive
		 *
		 * Renders the truthy section if the current docObject being
		 * rendered has a parent that is the current context.
		 *
		 * @param {Object} options
		 */
		ifHasActive: function( options ){

			var parents = helpers.getParentsPathToSelf(getCurrent().name);

			for(var i = 0; i < parents.length; i++){

				if( parents[i].name === this.name ){
					return options.fn(this);
				}
			}

			return options.inverse(this);

		},
		/**
		 * @function documentjs.generators.html.defaultHelpers.ifHasOrIsActive
		 *
		 * Renders the truthy section if the current docObject being
		 * rendered has a parent that is the current context or is the
		 * current context.
		 *
		 * @param {Object} options
		 */
		ifHasOrIsActive: function( options ){
			if(this.name == getCurrent().name){
				return options.fn(this);
			} else {
				return helpers.ifHasActive.apply(this, arguments);
			}
		},
		/**
		 * @function documentjs.generators.html.defaultHelpers.ifFirstLevelChild
		 *
		 * Renders the truthy section if the current context is a first level
		 * child of the parent object.
		 *
		 * @param {Object} options
		 */
		ifFirstLevelChild: function(options){
			var children  = (docMap[config.parent].children || []);
			for(var i = 0 ; i < children.length; i++){
				if(children[i].name == this.name){
					return options.fn(this);
				}
			}
			return "";
		},

		//
		makeApiSection: function(options){
			var depth = (this.api && this.api !== this.name ? 1 : 0);
			var txt = "",
				periodReg = /\.\s/g;
				var item = docMap[this.api || getCurrent().name];
				if(!item){
					return "Can't find "+this.name+"!";
				}
				if(!item.children) {
					return this.name+" has no child objects";
				}
				var makeSignatures = function(signatures, defaultDescription, parent){

					signatures.forEach(function(signature){
						txt += "<div class='small-signature'>";
						txt += oldHelpers.linkTo(parent, "<code class='prettyprint'>"+esc(signature.code)+"</code>",{"class":"sig"});


						var description = (signature.description || defaultDescription)
						// remove all html tags
						.replace(/<\/?\w+((\s+\w+(\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)\/?>/g,"");

						periodReg.lastIndex = 0;
						periodReg.exec(description);
						var lastDot = periodReg.lastIndex;

						txt += "<p>"+replaceLinks(lastDot !== 0 ? description.substr(0, lastDot): description, docMap, config)+"</p>";
						txt += "</div>";
					});
				};
				var process = function(child){
					if(child.hide ){
						return;
					}
					txt += "<div class='group_"+depth+"'>";
					var item = docMap[child.name];
					if( item.signatures && child.type !== "typedef" ){
						makeSignatures(item.signatures, item.description, child.name);
					}
					if(child.children){
						depth++;
						child.children.sort(sortChildren).forEach(process);
						depth--;
					}
					txt += "</div>";
				};

				item.children.sort(sortChildren).forEach(process);


				return txt;
		},
		/**
		 * @function documentjs.generators.html.defaultHelpers.chain
		 *
		 * Chains multiple calls to mustache.
		 *
		 * @signature `{{chain [helperName...] content}}`
		 *
		 */
		chain: function(){
			var helpersToCall = [].slice.call(arguments, 0, arguments.length - 2).map(function(name){
				return OtherHandlebars.helpers[name];
			}),
			value = arguments[arguments.length - 2] || "";

			helpersToCall.forEach(function(helper){
				value = helper.call(OtherHandlebars, value);
			});

			return value;
		},
		/**
		 * @function documentjs.generators.html.defaultHelpers.makeSignature
		 *
		 * Makes the signature title html for a [documentjs.tags.signature @signature].
		 *
		 * @param {Object} code
		 */
		makeSignature: function(code){
			if(code){
				return esc(code);
			}

			var sig = "";
			// if it's a constructor add new
			if(this.type === "constructor"){
				sig += "new ";
			}

			// get the name part right
			var parent = docMap[this.parent];
			if(parent){
				if(parent.type == "prototype"){
					var parentParent = docMap[parent.parent];
					sig += (parentParent.alias || (lastPartOfName( parentParent.name) +".")  ).toLowerCase();

				} else {
					sig += (parent.alias || lastPartOfName( parent.name)+"." );
				}

				sig += ( lastPartOfName(this.name) || "function" );
			} else {
				sig += "function";
			}
			if(! /function|constructor/i.test(this.type) && !this.params && !this.returns){
				return helpers.makeType(this);
			}
			sig+="("+helpers.makeParamsString(this.params)+")";

			// now get the params



			return sig;

		},
		makeSignatureId: function(code){
			return "sig_" + helpers.makeSignature(code).replace(/\s/g,"").replace(/[^\w]/g,"_");
		},
		/**
		 * @function documentjs.generators.html.defaultHelpers.makeParentTitle
		 *
		 * Returns the parent docObject's title.
		 *
		 */
		makeParentTitle: function(){
			var root = docMap[config.parent];
			return root.title || root.name;
		},
		getLinkTitle: function(docObject) {
			var description = docObject.description || docObject.name;
			description = oldHelpers.stripMarkdown(description);
			return unescapeHTML(description).replace(/\n/g, " ").trim();
		}
	};

	return helpers;
};
