const parseComment = require('tokenize-comment');

/**
 * Class used to tokenize file contents and generate __docgenInfo code
 */
class Tokenizer {
	/**
	 * Currently, the only language supported is "js"
	 * @param [language="js"]
	 */
	constructor(language = 'js') {
		this.language = language;
	}

	/**
	 * Look through a source file and pick out all the comment blocks
	 * @param {String} fileSrc  The sourcecode of a file
	 * @returns {Object[]}
	 * @see this.getContext() for properties returned
	 */
	scanSource(fileSrc) {
		const matchComment = /(\/\*\*[\s\S]+?\*\/)\s*([^;){]+[;){])/g;
		const blocks = [];
		fileSrc.replace(matchComment, ($0, comment, code) => {
			blocks.push({
				comment,
				...this.getContext(code),
			});
		});
		return blocks;
	}

	/**
	 * Given the code immediately following a comment block, get context about it
	 * @param {String} code  The sourcecode
	 * @returns {Object}
	 * @property {String} comment  The whole comment text
	 * @property {String} type  The type of match (one of "class", "function" or "variable")
	 * @property {String|null} subtype  The secondary type if applicable (one of "constructor", "method", "variable" or "property")
	 * @property {String} name  The identifier of the class, function or variable
	 * @property {Object[]} [params]  The list of parameters the function had
	 * @property {String} [argsString]  The string between a function's parenthesis
	 * @property {Boolean} [isAsync]  True if the function is async
	 * @property {Boolean} canAddDocgen  True if adding __docgenInfo to the identifier will probably work
	 */
	getContext(code) {
		let match;
		// these regexes are specific to JavaScript
		match = code.match(
			//                      $1
			// export default class MyClass
			/^(?:|export |export default )class\s+([$a-zA-Z_][$\w_]*) /
		);
		if (match) {
			return {
				type: 'class',
				subtype: null,
				name: match[1],
				params: null,
				canAddDocgen: false,
			};
		}
		match = code.match(
			//                $1             $2
			// export default async function foo
			/^(?:|export\s+|export default\s+)(async\s+)?function\s*([$a-zA-Z_][$\w_]*)?/
		);
		if (match) {
			const { argsString, params } = this._parseSignature(code);
			return {
				type: 'function',
				subtype: null,
				name: match[2] || '',
				params,
				argsString,
				isAsync: !!match[1],
				canAddDocgen: !!match[2],
			};
		}
		// $1     $2 $3
		// foo.bar = async function
		match = code.match(/([$a-zA-Z_][$\w_.]*)\s*(=)\s*(async )?function/);
		if (match) {
			const { argsString, params } = this._parseSignature(code);
			return {
				type: 'function',
				subtype: 'variable',
				name: match[1],
				params,
				argsString,
				isAsync: !!match[3],
				canAddDocgen: true,
			};
		}
		// $1
		// constructor(
		match = code.match(/^constructor\s*\(/);
		if (match) {
			const { argsString, params } = this._parseSignature(code);
			return {
				type: 'function',
				subtype: 'constructor',
				name: 'constructor',
				params,
				argsString,
				canAddDocgen: false,
			};
		}
		// $1    $2
		// async method(args) {
		match = code.match(/^(async\s+)?([$a-zA-Z_][$\w_]*)[\s\S]+?\)\s*{$/);
		if (match) {
			const { argsString, params } = this._parseSignature(code);
			return {
				type: 'function',
				subtype: 'method',
				name: match[2],
				params,
				argsString,
				isAsync: !!match[1],
				canAddDocgen: false,
			};
		}
		// $1      $2
		// method: async (args) => {
		match = code.match(/^([$a-zA-Z_][$\w_]*)\s*:\s*(async\s+)?\(.*\)\s*=>/);
		if (match) {
			const { argsString, params } = this._parseSignature(code);
			return {
				type: 'function',
				subtype: 'method',
				name: match[1],
				params,
				argsString,
				isAsync: !!match[2],
				canAddDocgen: false,
			};
		}
		//      $1
		// this.something
		match = code.match(/^(this\.[$a-zA-Z_][$\w_]*)/);
		if (match) {
			return {
				type: 'variable',
				subtype: 'property',
				name: match[1],
				canAddDocgen: false,
			};
		}
		return {};
	}

	/**
	 * Given a file's source code, get try-catch code that will attempt to attach
	 * __docgenInfo properties where possible
	 * @param {String} fileSrc  The source code
	 * @returns {String}
	 */
	getDocgenCode(fileSrc) {
		const tryCatches = [];
		this.scanSource(fileSrc).map(block => {
			const tokenized = this.tokenizeBlock(block);
			if (!tokenized.canAddDocgen || tokenized.ignore) {
				return;
			}
			const info = {
				displayName: tokenized.name,
				description: tokenized.description,
				props: tokenized.params.map(param => ({
					description: param.description,
					required: param.required,
					type: { name: param.type || 'undefined' },
				})),
				javadoc: tokenized,
			};
			const stringified = JSON.stringify(info, null, 2);
			tryCatches.push(`
try {
  ${tokenized.name}.__docgenInfo = ${stringified};
} catch (e) {}`);
		});
		return tryCatches.join('\n');
	}

	/**
	 * Tokenize a comment along with it's next line of code
	 * @param {String} commentAndCode  The comment followed by one line of sourcecode
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
	 * @todo Support @var and nested properties
	 */
	tokenizeBlock(commentAndCode) {
		const base = parseComment(commentAndCode.comment);
		const final = {
			ignore: false,
			name: commentAndCode.name,
			description: base.description,
			access: null,
			chainable: null,
			deprecated: null,
			examples: this._formatExamples(base.examples),
			params: [],
			returns: {
				type: undefined,
				description: '',
				properties: [],
			},
			version: null,
			since: null,
			todos: [],
			see: [],
			throws: [],
			customTags: [],
			type: commentAndCode.type,
			subtype: commentAndCode.subtype,
			canAddDocgen: commentAndCode.canAddDocgen,
		};
		let lastProperties;
		for (const tag of base.tags) {
			if (tag.key.match(/^public|private|protected$/)) {
				final.access = tag.key;
			} else if (tag.key.match(/^api|access$/)) {
				final.access = tag.value;
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
					// We don't support properties that have properties
					// so remove the properties key
					const { properties, ...converted } = this._convertParamTag(tag);
					lastProperties.push({ ...converted });
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
		// handle implicit params
		if (final.params.length === 0) {
			final.params = commentAndCode.params;
		}
		// get implied access
		if (final.access === null) {
			final.access = final.name.match(/^_/) ? 'private' : 'public';
		}
		// calculate the signature if applicable
		if (final.type === 'function') {
			const maybeAsync = commentAndCode.isAsync ? 'async ' : '';
			const argsString = commentAndCode.argsString;
			const returnType = final.returns.type || 'undefined';
			final.signature = `${maybeAsync}${final.name}(${argsString}) ⇒ {${returnType}}`.trim();
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
			data.value.match(/^(?:{([^}]+)}\s+)?([\w_[\]='"]+)?(\s+.+)?$/) || [];
		const [, nameWithoutBrackets, defValue] =
			(name || '').match(/^\[(.+?)(?:=(.+))]$/) || [];
		return {
			type: type ? this._normalizeType(type) : undefined,
			name: nameWithoutBrackets || name,
			description: this._normalizeWhitespace(description),
			required: !/^\[/.test(name) || /^\?/.test(type),
			default: defValue,
			properties: [],
		};
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
	 * Parse a code signature to pull out the arg string and params
	 * @param {String} signature  The code signature
	 * @example "export default function round(number, precision = 0) {"
	 * @returns {Object}
	 * @property {String} argsString  The string between the parenthesis
	 * @property {Object[]} params  Params object with type, name, description, required, default, properties
	 * @private
	 */
	_parseSignature(signature) {
		const [, betweenParens] = signature.match(/.*?\(([\s\S]*)\)/) || [];
		if (!betweenParens) {
			return { argsString: '', params: [] };
		}
		const argNames = [];
		const hasEquals = [];
		let i = 0;
		betweenParens.replace(/([$a-z_]+[$\w_]*)\s*($|,|=)/gi, ($0, key, sep) => {
			if (!this._isReservedWord(key)) {
				hasEquals[i++] = sep === '=';
				argNames.push(key);
			}
		});
		const code = `(function() {
	with ({
	  ${argNames.map(name => `${name}: undefined`).join(',\n')}	  	
	}) {
	  return [${betweenParens}];
	}
})();	
`;
		// (1, eval) is indirect eval. It is used her to avoid strict mode errors
		// because "with" is not allowed in strict mode code
		const defaults = (1, eval)(code);
		const params = argNames.map((name, idx) => {
			const defValue = defaults[idx];
			return {
				type: this._getType(defValue),
				name,
				description: '',
				required: !hasEquals[idx],
				default: defValue,
				properties: [],
			};
		});
		return {
			argsString: betweenParens.trim(),
			params,
		};
	}

	/**
	 * Check if the given text is a reserved word in JavaScript
	 * @param {String} word  The string to check
	 * @returns {Boolean}
	 * @private
	 */
	_isReservedWord(word) {
		return /^true|false|null|undefined$/.test(word);
	}

	/**
	 * Given the data type of the given value (where null returns "null")
	 * @param {*} value  Any value
	 * @returns {string|undefined}
	 * @private
	 */
	_getType(value) {
		if (value === null) {
			return 'null';
		} else if (value === undefined) {
			return undefined;
		} else if (Array.isArray(value)) {
			return 'Array';
		}
		// capitalize others
		const type = typeof value;
		return type.slice(0, 1).toUpperCase() + type.slice(1);
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
