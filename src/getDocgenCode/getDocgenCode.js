const extract = require('../extract/extract.js');

function getDocgenCode(sourceCode, parser = null) {
	const blocks = extract(sourceCode, parser);
	const tryCatches = [];
	blocks.forEach(block => {
		if (!block.canAddDocgen || block.ignore) {
			return;
		}
		const info = {
			displayName: block.name,
			description: block.description,
			props: _getDocgenProps(block.params),
			javadoc: block,
		};
		const stringified = JSON.stringify(info, null, 2);
		tryCatches.push(`
try {
  ${block.name}.__docgenInfo = ${stringified};
} catch (e) {}`);
	});
	return tryCatches.join('\n');
}

/**
 * Given an array of javadoc params, convert to docgen props
 * @param {Array} params
 * @property {String} description  The prop description
 * @property {Boolean} required  True of prop is required
 * @property {Object} type  The prop type
 * @property {String} type.name  The name of the type
 * @returns {Object[]}
 * @private
 */
function _getDocgenProps(params) {
	const props = {};
	params.forEach(param => {
		props[param.name] = {
			description: param.description,
			required: param.required,
			type: { name: param.type },
			defaultValue: { value: param.default, computed: false },
		};
	});
	return props;
}

module.exports = getDocgenCode;
