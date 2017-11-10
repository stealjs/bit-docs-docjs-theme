var $ = require("jquery");

require("./styles/styles.less");
require("./styles/github-v2.css");

$(function() {
	var headings = {};
	var collected = collectHeadings();

	collected.each(function() {
		var $el = $(this);
		var id = $el.attr("id");

		if (id) headings[id] = true;
	});


	collected.each(function() {
		var $el = $(this);
		var id = $el.attr("id");

		if (!id) {
			id = makeAnchorHeadingId($el.text());
			var token = getUniqueToken(id, headings);

			id += (token > 0) ? "-" + token : "";
			headings[id] = true;

			$el.attr("id", id);
		}

		$el.prepend(anchorTemplate({ id: id }));
		$el.addClass('anchored-heading');
	});

	if (window.location.hash.length) {
		var id = window.location.hash.replace("#", "");
		var anchor = document.getElementById(id);

		if (anchor) {
			anchor.scrollIntoView(true);
		}
	}

	function getUniqueToken(id, headings) {
		var token = 0;
		var uniq = id;

		while (headings[uniq]) {
			token += 1;
			uniq = id + "-" + token;
		}

		return token;
	}

	function collectHeadings() {
		return $(".content .comment h2, .content .comment h3");
	}

	function makeAnchorHeadingId(anchorText) {
		return (anchorText || "")
		.replace(/\s/g, "-")       // replace spaces with dashes
		.replace(/[^\w\-]/g, "")   // remove punctuation
		.toLowerCase();
	}

	function anchorTemplate(ctx) {
		var id = encodeURIComponent(ctx.id);

		return (
			'<a class="anchor" href="#' + id + '" aria-hidden="true">' +
				'<svg aria-hidden="true" class="octicon octicon-link" height="16" version="1.1" viewBox="0 0 16 16" width="16">' +
					'<path d="M4 9h1v1h-1c-1.5 0-3-1.69-3-3.5s1.55-3.5 3-3.5h4c1.45 0 3 1.69 3 3.5 0 1.41-0.91 2.72-2 3.25v-1.16c0.58-0.45 1-1.27 1-2.09 0-1.28-1.02-2.5-2-2.5H4c-0.98 0-2 1.22-2 2.5s1 2.5 2 2.5z m9-3h-1v1h1c1 0 2 1.22 2 2.5s-1.02 2.5-2 2.5H9c-0.98 0-2-1.22-2-2.5 0-0.83 0.42-1.64 1-2.09v-1.16c-1.09 0.53-2 1.84-2 3.25 0 1.81 1.55 3.5 3 3.5h4c1.45 0 3-1.69 3-3.5s-1.5-3.5-3-3.5z"></path>' +
				'</svg>' +
			'</a>'
		);
	}
});
