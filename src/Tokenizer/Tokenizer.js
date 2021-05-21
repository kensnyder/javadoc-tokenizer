const parseComment = require('tokenize-comment');

/**
 * Class used to tokenize file contents and generate __docgenInfo code
 */
class Tokenizer {
	/**
	 * Tokenize a comment along with it's next line of code
	 * @param {Object} block  The block extracted by the parser
	 * @property {String} name  The function name
	 * @returns {Object}  All the details
	 * @property {Boolean} ignore  True if an @ignore tag is present
	 * @property {String} name  The identifier
	 * @property {String} description  The description text above the tags
	 * @property {String} access  Normally one of "public", "private" or "protected"
	 * @property {Object[]} params  Details on function arguments (see this._convertParamTag)
	 * @property {Boolean|null} chainable  True if a @chanable tag is present
	 * @property {Boolean|null} deprecated  True if a @deprecated tag is present
	 * @property {Object[]} examples  Code examples under @example or under description
	 * @property {Object} returns  The type, description and properties of the return value
	 * @property {String|null} version  The value of a @version tag if any
	 * @property {String|null} since  The value of a @since tag if any
	 * @property {String[]} todos  An array of text following @todo tags
	 * @property {String[]} see  An array of text following @see tags
	 * @property {Object[]} throws  An array of Objects containing type, description and properties following @throws tags (see this._convertTypedTag)
	 * @property {Object[]} customTags  An array of other tags with properties tag and value
	 * @property {String} type  The data type
	 * @property {String|undefined} subtype  The data sub type
	 * @property {Boolean} canAddDocgen  True if adding __docgenInfo to the identifier will probably work
	 */
	tokenizeBlock(block) {
		const base = parseComment(block.comment);
		const final = {
			name: block.name,
			signature: null,
			description: base.description,
			params: [],
			returns: {
				type: undefined,
				description: '',
				properties: [],
			},
			throws: [],
			examples: this._formatExamples(base.examples),
			access: null,
			chainable: null,
			deprecated: null,
			version: null,
			since: null,
			todos: [],
			see: [],
			customTags: [],
			type: block.type,
			subtype: block.subtype,
			ignore: false,
			contextCode: block.code,
			canAddDocgen: block.canAddDocgen,
		};
		let lastProperties;
		for (const tag of base.tags) {
			if (tag.key.match(/^public|private|protected$/)) {
				final.access = tag.key;
			} else if (tag.key.match(/^api|access$/)) {
				final.access = tag.value;
			} else if (tag.key.match(/^var|name$/)) {
				final.name = tag.value;
			} else if (tag.key.match(/^desc(ription)?$/)) {
				if (final.description) {
					final.description += '\n' + tag.value;
				} else {
					final.description = tag.value;
				}
			} else if (tag.key === 'ignore') {
				final.ignore = true;
			} else if (tag.key === 'chainable') {
				final.chainable = true;
			} else if (tag.key === 'see') {
				final.see.push(tag.value);
			} else if (tag.key === 'throws') {
				const param = this._convertTypedTag(tag);
				final.throws.push(param);
				lastProperties = param.properties;
			} else if (tag.key === 'version') {
				final.version = tag.value;
			} else if (tag.key === 'since') {
				final.since = tag.value;
			} else if (tag.key === 'todo') {
				final.todos.push(tag.value);
			} else if (tag.key === 'deprecated') {
				final.deprecated = true;
			} else if (tag.key === 'param') {
				const param = this._convertParamTag(tag);
				final.params.push(param);
				lastProperties = param.properties;
			} else if (tag.key === 'property') {
				if (lastProperties) {
					const converted = this._convertParamTag(tag);
					lastProperties.push(converted);
				}
			} else if (tag.key.match(/^returns?$/)) {
				const value = this._convertTypedTag(tag);
				final.returns = value;
				lastProperties = value.properties;
			} else {
				// unknown tags
				final.customTags.push({
					tag: tag.key,
					value: tag.value,
				});
			}
		}
		// get implied access
		if (final.access === null) {
			final.access = String(final.name).match(/^_/) ? 'private' : 'public';
		}
		// calculate the signature if applicable
		if (final.type === 'function') {
			const maybeAsync = block.async ? 'async ' : '';
			const argsString = block.argsString;
			const returnType = final.returns.type || 'undefined';
			final.signature =
				`${maybeAsync}${final.name}(${argsString}) ⇒ {${returnType}}`.trim();
		}
		return final;
	}

	/**
	 * Return data parsed from all code examples
	 * @param {Object[]} examples  Examples tokenized with npm's tokenize-comment library
	 * @returns {Object[]}
	 * @property {String} language  The detected code language (based off tags like ```js...)
	 * @property {String} description  The description of the example
	 * @property {String} type  The type of example
	 * @property {String} text  The text or code of example
	 * @private
	 */
	_formatExamples(examples) {
		if (!Array.isArray(examples)) {
			return [];
		}
		return examples.map(example => ({
			language: example.language || 'js',
			description: example.description.trim(),
			type: example.type,
			text: example.value.trim(),
		}));
	}

	/**
	 * Convert data parsed parameters
	 * @param {Object[]} data  A parameter tokenized with npm's tokenize-comment library
	 * @returns {Object}
	 * @property {String|undefined} type  The parameter's data type
	 * @property {String} name  The parameter name
	 * @property {String} description  The parameter description
	 * @property {Boolean} required  False if parameter is surrounded by brackets or typename has ? prefix
	 * @property {Object[]} properties  If parameter is an object, what sub properties it has
	 * @private
	 */
	_convertParamTag(data) {
		const [, type, name, description] =
			//  $1    $2         $3
			// {Type} paramName  Description
			data.value.match(/^(?:{([^}]+)}\s+)?([\w_[\]='".]+)?(\s+.+)?$/) || [];
		const [, nameWithoutBrackets, defValue] =
			//  $1   $2
			// [name=default]
			(name || '').match(/^\[(.+?)(?:=(.+))?]$/) || [];
		return {
			type: type ? this._normalizeType(type) : undefined,
			name: nameWithoutBrackets || name,
			description: this._normalizeWhitespace(description),
			required: !/^\[/.test(name) || /^\?/.test(type),
			default: this._castValue(defValue),
			properties: [],
		};
	}

	/**
	 * Attempt to eval the default value
	 * @param {*} value
	 * @returns {*}
	 * @private
	 */
	_castValue(value) {
		if (typeof value !== 'string') {
			return value;
		}
		let match;
		// int/float
		match = value.match(/^[\d.]+$/);
		if (match) {
			const number = parseFloat(value);
			return isNaN(number) ? value : number;
		}
		// boolean
		match = value.match(/^true|false$/);
		if (match) {
			return match[0] === 'true';
		}
		// null
		if (value === 'null') {
			return null;
		}
		// undefined
		if (value === 'undefined') {
			return undefined;
		}
		// string
		match = value.match(/^(["'])(.?)\1$/);
		if (match) {
			return match[2];
		}
		// array/object
		match = value.match(/^([\[{])(.?)\1$/);
		if (match) {
			try {
				return JSON.parse(value);
			} catch (e) {
				return value;
			}
		}
		return value;
	}

	/**
	 * Convert details from a @throws or @returns tag
	 * @param {Object} data  The tag tokenized with npm's tokenize-comment
	 * @returns {Object}
	 * @property {String|undefined} type  The item's data type
	 * @property {String} description  The item's description
	 * @property {Object[]} properties  The item's sub properties
	 * @private
	 */
	_convertTypedTag(data) {
		const [, type, description] =
			//  $1    $2
			// {Type} Description
			data.value.match(/^(?:{([^}]+)})?(.*)$/) || [];
		return {
			type: type ? this._normalizeType(type) : undefined,
			description: this._normalizeWhitespace(description.trim()),
			properties: [],
		};
	}

	/**
	 * Trim whitespace and convert multiple whitespace characters to a single one
	 * @param {String} string  The string to trim
	 * @returns {String}
	 * @private
	 */
	_normalizeWhitespace(string) {
		return (string || '').replace(/\s+/g, ' ').trim();
	}

	/**
	 * Given a type string or union type string, attempt to normalize the name
	 * @param {String} typename  The type string such as "bool", "boolean" or "Boolean"
	 * @returns {String}
	 * @private
	 */
	_normalizeType(typename) {
		const aliases = [
			{ re: /^bool(ean)?$/i, name: 'Boolean' },
			{ re: /^int(eger)?$/i, name: 'Number' },
			{ re: /^func(tion)?$/i, name: 'Function' },
			{ re: /^string$/i, name: 'String' },
			{ re: /^array$/i, name: 'Array' },
			{ re: /^null$/i, name: 'null' },
			{ re: /^undefined|void$/i, name: 'undefined' },
		];
		return typename
			.split('|')
			.map(input => {
				// remove nullable/not nullable symbols
				input = input.replace(/^[?!]/, '');
				let suffix = '';
				if (input.match(/\[]$/)) {
					suffix = [];
					input = input.slice(0, -2);
				}
				for (const { re, name } of aliases) {
					if (re.test(input)) {
						return name + suffix;
					}
				}
				return input;
			})
			.join('|');
	}
}

module.exports = Tokenizer;
