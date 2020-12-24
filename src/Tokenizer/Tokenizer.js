const parseComment = require('tokenize-comment');
const pretty = require('pretty-var-export');

class Tokenizer {
	constructor(language = 'js') {
		this.language = language;
	}
	scanSource(fileSrc) {
		const matchComment = /(\/\*\*[\s\S]+?\*\/)\s*([^;){]+[;){])/g;
		const blocks = [];
		fileSrc.replace(matchComment, ($0, comment, code) => {
			blocks.push({
				comment,
				context: this.getContext(code),
			});
		});
		return blocks;
	}
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
	tokenizeSource(fileSrc) {
		const blocks = this.scanSource(fileSrc);
		// get blocks and tokenize each
	}
	getDocgenCode(tokenized) {
		// 		// TODO: format into proper docgenInfo format
		// 		if (tokenized.canAddDocgen)
		//
		//
		// 		const docgen = JSON.stringify({
		// 			displayName,
		// 			description,
		// 			props,
		// 			propsOrder,
		// 			signature,
		// 			block: parseDocs(`/**\n${docblock}\n*/`),
		// 		return `try {
		// 	${identifier}.__docgenInfo = ${JSON.stringify(info)};
		// } catch (e) {}`;
	}
	tokenizeBlock(commentBlock) {
		const base = parseComment(commentBlock.comment);
		const final = {
			ignore: false,
			name: commentBlock.context.name,
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
			type: commentBlock.context.type,
			subtype: commentBlock.context.subtype,
			canAddDocgen: commentBlock.context.canAddDocgen,
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
			final.params = commentBlock.context.params;
		}
		// get implied access
		if (final.access === null) {
			final.access = final.name.match(/^_/) ? 'private' : 'public';
		}
		// calculate the signature if applicable
		if (final.type === 'function') {
			const maybeAsync = commentBlock.context.isAsync ? 'async ' : '';
			const argsString = commentBlock.context.argsString;
			const returnType = final.returns.type || 'undefined';
			final.signature = `${maybeAsync}${final.name}(${argsString}) ⇒ {${returnType}}`.trim();
		}
		return final;
	}
	_formatExamples(examples) {
		return examples.map(example => ({
			language: example.language || 'js',
			description: example.description.trim(),
			type: example.type,
			text: example.value.trim(),
		}));
	}
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
			required: !/^\[/.test(name),
			default: defValue,
			properties: [],
		};
	}
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
	_isReservedWord(word) {
		return /^true|false|null|undefined$/.test(word);
	}
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
	_normalizeWhitespace(string) {
		return (string || '').replace(/\s+/g, ' ').trim();
	}
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
