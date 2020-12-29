class JsRegexParser {
	/**
	 * Look through a source file and pick out all the comment blocks
	 * @param {String} fileSrc  The sourcecode of a file
	 * @returns {Object[]}
	 * @see this.getContext() for properties returned
	 */
	extractBlocks(fileSrc) {
		const matchComment = /(\/\*\*[\s\S]+?\*\/)\s*([^;){]+[;){])/g;
		const blocks = [];
		fileSrc.replace(matchComment, ($0, comment, code) => {
			blocks.push({
				comment,
				code,
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
		code = code.trim();
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
				isAsync: null,
				argsString: null,
				canAddDocgen: false,
			};
		}
		match = code.match(
			//                $1             $2
			// export default async function foo
			/^(?:|export\s+|export default\s+)(async\s+)?function\s*([$a-zA-Z_][$\w_]*)?/
		);
		if (match) {
			return {
				type: 'function',
				subtype: null,
				name: match[2] || '',
				isAsync: !!match[1],
				argsString: this._extractArgsString(code),
				canAddDocgen: !!match[2],
			};
		}
		// $1     $2 $3
		// foo.bar = async function
		//       $1 $2 $3
		// const foo = async function
		match = code.match(/([$a-zA-Z_][$\w_.]*)\s*(=)\s*(async )?function/);
		if (match) {
			return {
				type: 'function',
				subtype: 'variable',
				name: match[1],
				isAsync: !!match[3],
				argsString: this._extractArgsString(code),
				canAddDocgen: true,
			};
		}
		// $1
		// constructor(
		match = code.match(/^constructor\s*\(/);
		if (match) {
			return {
				type: 'function',
				subtype: 'constructor',
				name: 'constructor',
				isAsync: false,
				argsString: this._extractArgsString(code),
				canAddDocgen: false,
			};
		}
		// $1      $2
		// method: async (args) => {
		match = code.match(/^([$a-zA-Z_][$\w_]*)\s*:\s*(async\s+)?\(.*\)\s*=>/);
		if (match) {
			return {
				type: 'function',
				subtype: 'method',
				name: match[1],
				isAsync: !!match[2],
				argsString: this._extractArgsString(code),
				canAddDocgen: false,
			};
		}
		// $1    $2     $3
		// async method(args) {
		match = code.match(/^(async\s+)?([$a-zA-Z_][$\w_]*)[\s\S]+?\)/);
		if (match) {
			return {
				type: 'function',
				subtype: 'method',
				name: match[2],
				isAsync: !!match[1],
				argsString: this._extractArgsString(code),
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
				isAsync: null,
				argsString: null,
				canAddDocgen: false,
			};
		}
		return {};
	}

	/**
	 * Pull out all code between parenthesis
	 * @param {String} code  The code following the comment
	 * @returns {String}  The arguments string
	 * @private
	 */
	_extractArgsString(code) {
		//          $1
		// function(a, b)
		const match = code.match(/\(([\s\S]+)\)/);
		if (!match) {
			return '';
		}
		return match[1];
	}
}

module.exports = JsRegexParser;
