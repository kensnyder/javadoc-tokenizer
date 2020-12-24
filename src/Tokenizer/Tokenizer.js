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
		match =
			code.match(
				/^(?:|export |export default )function\s*([$a-zA-Z_][$\w_]*)?/
			) || code.match(/([$a-zA-Z_][$\w_.]*)\s*(=)\s*function/);
		if (match) {
			return {
				type: 'function',
				subtype: match[2] === '=' ? 'variable' : null,
				name: match[1] || '',
				params: this._parseSignature(code),
				canAddDocgen: !!match[1],
			};
		}
		match = code.match(/^constructor\s*\(/);
		if (match) {
			return {
				type: 'function',
				subtype: 'constructor',
				name: 'constructor',
				params: this._parseSignature(code),
				canAddDocgen: false,
			};
		}
		match =
			code.match(/^([$a-zA-Z_][$\w_]*)[\s\S]+?\)\s*{$/) ||
			code.match(/^([$a-zA-Z_][$\w_]*)\s*:\s*\(.*\)/);
		if (match) {
			return {
				type: 'function',
				subtype: 'method',
				name: match[1],
				params: this._parseSignature(code),
				canAddDocgen: false,
			};
		}
		match = code.match(/^(this\.[$a-zA-Z_][$\w_]*)/);
		if (match) {
			return {
				type: 'variable',
				subtype: 'property',
				name: match[1],
				params: null,
				canAddDocgen: false,
			};
		}
		return {};
	}
	tokenizeSource(fileSrc) {
		const blocks = this.scanSource(fileSrc);
		// get blocks and tokenize each
	}
	addDocgen(identifier, tokenized) {
		// TODO: format into proper docgenInfo format
		return `try {
	${identifier}.__docgenInfo = ${JSON.stringify(info)};
} catch (e) {}`;
	}
	tokenizeBlock(commentBlock) {
		const base = parseComment(commentBlock.comment);
		pretty.log({ base });
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
			} else if (tag.key.match(/^desc(ription)$/)) {
				final.description = tag.value;
			} else if (tag.key === 'ignore') {
				final.ignore = true;
			} else if (tag.key === 'chainable') {
				final.chainable = true;
			} else if (tag.key === 'see') {
				final.see.push(tag.value);
			} else if (tag.key === 'throws') {
				final.throws.push(tag.value);
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
					lastProperties.push(this._convertParamTag(tag));
				}
			} else if (tag.key.match(/^returns?$/)) {
				const converted = this._convertParamTag(tag);
				const value = {
					type: converted.type,
					description: converted.description,
					properties: [],
				};
				lastProperties = value.properties;
			} else {
				// unknown tags
				final.customTags.push({
					tag: tag.key,
					value: tag.value,
				});
			}
		}
		if (final.params.length === 0) {
			final.params = commentBlock.context.params;
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
			data.value.match(/^(?:{([^}]+)}\s+)?([\w_[\]='"]+)(\s+.+)?$/) || [];
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
	_parseSignature(signature) {
		const [, betweenParens] = signature.match(/.*?\(([\s\S]*)\)/) || [];
		if (!betweenParens) {
			return [];
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
		// (1, eval) is indirect eval used to avoid strict mode errors
		// because "with" is not allowed in strict mode code
		const defaults = (1, eval)(code);
		return argNames.map((name, idx) => {
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
