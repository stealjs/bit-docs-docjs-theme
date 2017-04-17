var path = require("path");

/**
 * @module {function} bit-docs-docjs-theme
 * @group bit-docs-docjs-theme/modules modules
 * @parent plugins
 *
 * @description The old DocumentJS theme.
 *
 * @body
 *
 * TBD
 */
module.exports = function(bitDocs){
    var pkg = require("./package.json");
    var dependencies = {};
    dependencies[pkg.name] = pkg.version;

    bitDocs.register("html", {
        templates: path.join(__dirname, "templates"),
        dependencies: dependencies
    });
}
