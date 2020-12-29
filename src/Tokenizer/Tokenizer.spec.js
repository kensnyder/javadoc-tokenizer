const Tokenizer = require('./Tokenizer.js');
const pretty = require('pretty-var-export');
const fs = require('fs');

describe('Tokenizer.tokenizeBlock', () => {
	it('should handle ignore', () => {
		const comment = `
/**
 * @ignore 		
 */
`;
		const tokenizer = new Tokenizer();
		const tokenized = tokenizer.tokenizeBlock({ comment });
		expect(tokenized.ignore).toBe(true);
	});

	it('should handle description', () => {
		const comment = `
/**
 * @desc Does stuff		
 */
`;
		const tokenizer = new Tokenizer();
		const tokenized = tokenizer.tokenizeBlock({ comment });
		expect(tokenized.description).toBe('Does stuff');
	});

	it('should handle double description', () => {
		const comment = `
/**
 * Description		
 * @desc Does stuff		
 */
`;
		const tokenizer = new Tokenizer();
		const tokenized = tokenizer.tokenizeBlock({ comment });
		expect(tokenized.description).toBe('Description\nDoes stuff');
	});

	it('should handle @public', () => {
		const comment = `
/**
 * @public		
 */
`;
		const tokenizer = new Tokenizer();
		const tokenized = tokenizer.tokenizeBlock({ comment });
		expect(tokenized.access).toBe('public');
	});

	it('should handle @private', () => {
		const comment = `
/**
 * @private		
 */
`;
		const tokenizer = new Tokenizer();
		const tokenized = tokenizer.tokenizeBlock({ comment });
		expect(tokenized.access).toBe('private');
	});

	it('should handle @protected', () => {
		const comment = `
/**
 * @protected		
 */
`;
		const tokenizer = new Tokenizer();
		const tokenized = tokenizer.tokenizeBlock({ comment });
		expect(tokenized.access).toBe('protected');
	});

	it('should handle @access', () => {
		const comment = `
/**
 * @access public		
 */
`;
		const tokenizer = new Tokenizer();
		const tokenized = tokenizer.tokenizeBlock({ comment });
		expect(tokenized.access).toBe('public');
	});

	it('should infer public access', () => {
		const comment = `
/**
 * A thing		
 */
`;
		const tokenizer = new Tokenizer();
		const tokenized = tokenizer.tokenizeBlock({ comment });
		expect(tokenized.access).toBe('public');
	});

	it('should recognize @chainable', () => {
		const comment = `
/**
 * @chainable		
 */
`;
		const tokenizer = new Tokenizer();
		const tokenized = tokenizer.tokenizeBlock({ comment });
		expect(tokenized.chainable).toBe(true);
	});

	it('should recognize @deprecated', () => {
		const comment = `
/**
 * @deprecated		
 */
`;
		const tokenizer = new Tokenizer();
		const tokenized = tokenizer.tokenizeBlock({ comment });
		expect(tokenized.deprecated).toBe(true);
	});

	it('should recognize @version', () => {
		const comment = `
/**
 * @version 1.0.0		
 */
`;
		const tokenizer = new Tokenizer();
		const tokenized = tokenizer.tokenizeBlock({ comment });
		expect(tokenized.version).toBe('1.0.0');
	});

	it('should recognize @since', () => {
		const comment = `
/**
 * @since 1.0.0		
 */
`;
		const tokenizer = new Tokenizer();
		const tokenized = tokenizer.tokenizeBlock({ comment });
		expect(tokenized.since).toBe('1.0.0');
	});

	it('should recognize @todo', () => {
		const comment = `
/**
 * @todo Refactor this 
 * @todo Add features		
 */
`;
		const tokenizer = new Tokenizer();
		const tokenized = tokenizer.tokenizeBlock({ comment });
		expect(tokenized.todos).toEqual(['Refactor this', 'Add features']);
	});

	it('should recognize @see', () => {
		const comment = `
/**
 * @see https://example.com/there
 * @see bar function
 */
`;
		const tokenizer = new Tokenizer();
		const tokenized = tokenizer.tokenizeBlock({ comment });
		expect(tokenized.see).toEqual([
			'https://example.com/there',
			'bar function',
		]);
	});

	it('should recognize @throws', () => {
		const comment = `
/**
 * @throws {Error} When max is not a number
 */
`;
		const tokenizer = new Tokenizer();
		const tokenized = tokenizer.tokenizeBlock({ comment });
		expect(tokenized.throws).toEqual([
			{
				type: 'Error',
				description: 'When max is not a number',
				properties: [],
			},
		]);
	});

	it('should catch custom tags', () => {
		const comment = `
/**
 * @foobar baz
 * @fizz buzz
 */
`;
		const tokenizer = new Tokenizer();
		const tokenized = tokenizer.tokenizeBlock({ comment });
		expect(tokenized.customTags).toEqual([
			{
				tag: 'foobar',
				value: 'baz',
			},
			{
				tag: 'fizz',
				value: 'buzz',
			},
		]);
	});

	it('should attach properties to @param', () => {
		const comment = `
/**
 * @param {Object} options
 * @property {Boolean} doIt  If true, do the thing
 * @property {String} name  The thing name
 */
`;
		const tokenizer = new Tokenizer();
		const tokenized = tokenizer.tokenizeBlock({ comment });
		expect(tokenized.params).toMatchObject([
			{
				type: 'Object',
				name: 'options',
				description: '',
				required: true,
				default: undefined,
				properties: [
					{
						type: 'Boolean',
						name: 'doIt',
						description: 'If true, do the thing',
						required: true,
						default: undefined,
					},
					{
						type: 'String',
						name: 'name',
						description: 'The thing name',
						required: true,
						default: undefined,
					},
				],
			},
		]);
	});
});
describe('Tokenizer._convertParamTag', () => {
	it('should parse a comment block', () => {
		const tokenizer = new Tokenizer();
		const converted = tokenizer._convertParamTag({
			type: 'tag',
			raw:
				'@param {Number|String} [precision="auto"]  The decimal precision or "auto"',
			key: 'param',
			value:
				'{Number|String} [precision="auto"]  The decimal precision or "auto"',
		});
		expect(converted).toEqual({
			type: 'Number|String',
			name: 'precision',
			description: 'The decimal precision or "auto"',
			required: false,
			default: '"auto"',
			properties: [],
		});
	});
	it('should interpret int type as Number', () => {
		const tokenizer = new Tokenizer();
		const converted = tokenizer._convertParamTag({
			type: 'tag',
			raw: '@param {int} max The max amount',
			key: 'param',
			value: '{int} max The max amount',
		});
		expect(converted).toEqual({
			type: 'Number',
			name: 'max',
			description: 'The max amount',
			required: true,
			default: undefined,
			properties: [],
		});
	});
	it('should handle empty descriptions', () => {
		const tokenizer = new Tokenizer();
		const converted = tokenizer._convertParamTag({
			type: 'tag',
			raw: '@param {int} max',
			key: 'param',
			value: '{int} max',
		});
		expect(converted).toEqual({
			type: 'Number',
			name: 'max',
			description: '',
			required: true,
			default: undefined,
			properties: [],
		});
	});
	it('should handle empty types', () => {
		const tokenizer = new Tokenizer();
		const converted = tokenizer._convertParamTag({
			type: 'tag',
			raw: '@param max The max amount',
			key: 'param',
			value: 'max The max amount',
		});
		expect(converted).toEqual({
			type: undefined,
			name: 'max',
			description: 'The max amount',
			required: true,
			default: undefined,
			properties: [],
		});
	});
});

describe('Tokenizer._convertTypedTag', () => {
	it('should parse throws', () => {
		const tokenizer = new Tokenizer();
		const converted = tokenizer._convertTypedTag({
			type: 'tag',
			raw: '@throws {Error}',
			key: 'throws',
			value: '{Error}',
		});
		expect(converted).toEqual({
			type: 'Error',
			description: '',
			properties: [],
		});
	});
	it('should parse empty throws', () => {
		const tokenizer = new Tokenizer();
		const converted = tokenizer._convertTypedTag({
			type: 'tag',
			raw: '@throws',
			key: 'throws',
			value: '',
		});
		expect(converted).toEqual({
			type: undefined,
			description: '',
			properties: [],
		});
	});
	it('should parse throws with type and description', () => {
		const tokenizer = new Tokenizer();
		const converted = tokenizer._convertTypedTag({
			type: 'tag',
			raw: '@throws {MyException} When stuff goes sour',
			key: 'throws',
			value: '{MyException} When stuff goes sour',
		});
		expect(converted).toEqual({
			type: 'MyException',
			description: 'When stuff goes sour',
			properties: [],
		});
	});
	it('should parse throws with description but no type', () => {
		const tokenizer = new Tokenizer();
		const converted = tokenizer._convertTypedTag({
			type: 'tag',
			raw: '@throws When stuff goes sour',
			key: 'throws',
			value: 'When stuff goes sour',
		});
		expect(converted).toEqual({
			type: undefined,
			description: 'When stuff goes sour',
			properties: [],
		});
	});
});
