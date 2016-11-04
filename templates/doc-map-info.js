module.exports = function(docMap) {
	return {
		docMap: docMap,
		childrenMap: makeChildrenMap(docMap),

		getChildren: function(docObject) {
			var children = this.childrenMap[docObject.name] || [];
			return children.sort(sortChildren);
		}
	};

	function makeChildrenMap(docMap){
		var childrenMap = {};

		for (var name in docMap) {
			var docObject = docMap[name];
			var parent = docObject.parent;

			if (parent) {
				if (!childrenMap[parent]) {
					childrenMap[parent] = [];
				}
				childrenMap[parent].push(docObject);
			}
		}

		return childrenMap;
	}

	function sortChildren(child1, child2){
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
	}
};
