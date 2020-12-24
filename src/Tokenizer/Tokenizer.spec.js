const Tokenizer = require('./Tokenizer.js');
const pretty = require('pretty-var-export');
const fs = require('fs');
const fixtureJs1Function = fs.readFileSync(
	`${__dirname}/../../test-fixtures/js-1-function.js`,
	'utf8'
);
const fixtureJs2Functions = fs.readFileSync(
	`${__dirname}/../../test-fixtures/js-2-functions.js`,
	'utf8'
);

describe('Tokenizer.getContext', () => {
	it('should find classes', () => {
		const tokenizer = new Tokenizer();
		const context = tokenizer.getContext('class MyClass {');
		expect(context).toEqual({
			type: 'class',
			subtype: null,
			name: 'MyClass',
			params: null,
			canAddDocgen: false,
		});
	});
	it('should find functions', () => {
		const tokenizer = new Tokenizer();
		const context = tokenizer.getContext('function(a) {');
		expect(context).toEqual({
			type: 'function',
			subtype: null,
			name: '',
			params: [
				{
					default: undefined,
					description: '',
					name: 'a',
					properties: [],
					required: true,
					type: undefined,
				},
			],
			argsString: 'a',
			isAsync: false,
			canAddDocgen: false,
		});
	});
	it('should find constructor', () => {
		const tokenizer = new Tokenizer();
		const context = tokenizer.getContext('constructor(a) {');
		expect(context).toEqual({
			type: 'function',
			subtype: 'constructor',
			name: 'constructor',
			params: [
				{
					default: undefined,
					description: '',
					name: 'a',
					properties: [],
					required: true,
					type: undefined,
				},
			],
			argsString: 'a',
			canAddDocgen: false,
		});
	});
	it('should find exported functions', () => {
		const tokenizer = new Tokenizer();
		const context = tokenizer.getContext('export function(a) {');
		expect(context).toEqual({
			type: 'function',
			subtype: null,
			name: '',
			params: [
				{
					default: undefined,
					description: '',
					name: 'a',
					properties: [],
					required: true,
					type: undefined,
				},
			],
			argsString: 'a',
			isAsync: false,
			canAddDocgen: false,
		});
	});
	it('should find default exported functions', () => {
		const tokenizer = new Tokenizer();
		const context = tokenizer.getContext('export default async function(a) {');
		expect(context).toEqual({
			type: 'function',
			subtype: null,
			name: '',
			params: [
				{
					default: undefined,
					description: '',
					name: 'a',
					properties: [],
					required: true,
					type: undefined,
				},
			],
			argsString: 'a',
			isAsync: true,
			canAddDocgen: false,
		});
	});
	it('should find assigned functions', () => {
		const tokenizer = new Tokenizer();
		const context = tokenizer.getContext('const a = async function(b) {');
		expect(context).toEqual({
			type: 'function',
			subtype: 'variable',
			name: 'a',
			params: [
				{
					default: undefined,
					description: '',
					name: 'b',
					properties: [],
					required: true,
					type: undefined,
				},
			],
			argsString: 'b',
			isAsync: true,
			canAddDocgen: true,
		});
	});
	it('should find property functions', () => {
		const tokenizer = new Tokenizer();
		const context = tokenizer.getContext('a.b = function(c) {');
		expect(context).toEqual({
			type: 'function',
			subtype: 'variable',
			name: 'a.b',
			params: [
				{
					default: undefined,
					description: '',
					name: 'c',
					properties: [],
					required: true,
					type: undefined,
				},
			],
			argsString: 'c',
			isAsync: false,
			canAddDocgen: true,
		});
	});
	it('should find class methods', () => {
		const tokenizer = new Tokenizer();
		const context = tokenizer.getContext('async method(a) {');
		expect(context).toEqual({
			type: 'function',
			subtype: 'method',
			name: 'method',
			params: [
				{
					default: undefined,
					description: '',
					name: 'a',
					properties: [],
					required: true,
					type: undefined,
				},
			],
			argsString: 'a',
			isAsync: true,
			canAddDocgen: false,
		});
	});
	it('should find class property methods', () => {
		const tokenizer = new Tokenizer();
		const context = tokenizer.getContext('method: async (a) => {');
		expect(context).toEqual({
			type: 'function',
			subtype: 'method',
			name: 'method',
			params: [
				{
					default: undefined,
					description: '',
					name: 'a',
					properties: [],
					required: true,
					type: undefined,
				},
			],
			argsString: 'a',
			isAsync: true,
			canAddDocgen: false,
		});
	});
	it('should find class properties', () => {
		const tokenizer = new Tokenizer();
		const context = tokenizer.getContext('this.max = 5;');
		expect(context).toEqual({
			type: 'variable',
			subtype: 'property',
			name: 'this.max',
			canAddDocgen: false,
		});
	});
});

describe('Tokenizer.scanSource', () => {
	it('should find 1 comment block', () => {
		const tokenizer = new Tokenizer();
		const blocks = tokenizer.scanSource(fixtureJs1Function);
		expect(blocks).toHaveLength(1);
	});
	it('should find 2 comment blocks', () => {
		const tokenizer = new Tokenizer();
		const blocks = tokenizer.scanSource(fixtureJs2Functions);
		expect(blocks).toHaveLength(2);
	});
});
describe('Tokenizer.tokenizeBlock', () => {
	it('should handle ignore', () => {
		const source = `
/**
 * @ignore 		
 */
function foo() {}`;
		const tokenizer = new Tokenizer();
		const blocks = tokenizer.scanSource(source);
		const tokenized = tokenizer.tokenizeBlock(blocks[0]);
		expect(tokenized.ignore).toBe(true);
	});

	it('should handle description', () => {
		const source = `
/**
 * @desc Does stuff		
 */
function foo() {}`;
		const tokenizer = new Tokenizer();
		const blocks = tokenizer.scanSource(source);
		const tokenized = tokenizer.tokenizeBlock(blocks[0]);
		expect(tokenized.name).toBe('foo');
		expect(tokenized.description).toBe('Does stuff');
	});

	it('should handle double description', () => {
		const source = `
/**
 * Description		
 * @desc Does stuff		
 */
function foo() {}`;
		const tokenizer = new Tokenizer();
		const blocks = tokenizer.scanSource(source);
		const tokenized = tokenizer.tokenizeBlock(blocks[0]);
		expect(tokenized.name).toBe('foo');
		expect(tokenized.description).toBe('Description\nDoes stuff');
	});

	it('should handle @public', () => {
		const source = `
/**
 * @public		
 */
function foo() {}`;
		const tokenizer = new Tokenizer();
		const blocks = tokenizer.scanSource(source);
		const tokenized = tokenizer.tokenizeBlock(blocks[0]);
		expect(tokenized.access).toBe('public');
	});

	it('should handle @private', () => {
		const source = `
/**
 * @private		
 */
function foo() {}`;
		const tokenizer = new Tokenizer();
		const blocks = tokenizer.scanSource(source);
		const tokenized = tokenizer.tokenizeBlock(blocks[0]);
		expect(tokenized.access).toBe('private');
	});

	it('should handle @protected', () => {
		const source = `
/**
 * @protected		
 */
function foo() {}`;
		const tokenizer = new Tokenizer();
		const blocks = tokenizer.scanSource(source);
		const tokenized = tokenizer.tokenizeBlock(blocks[0]);
		expect(tokenized.access).toBe('protected');
	});

	it('should handle @access', () => {
		const source = `
/**
 * @access public		
 */
function foo() {}`;
		const tokenizer = new Tokenizer();
		const blocks = tokenizer.scanSource(source);
		const tokenized = tokenizer.tokenizeBlock(blocks[0]);
		expect(tokenized.access).toBe('public');
	});

	it('should infer public access', () => {
		const source = `
/**
 * A thing		
 */
function foo() {}`;
		const tokenizer = new Tokenizer();
		const blocks = tokenizer.scanSource(source);
		const tokenized = tokenizer.tokenizeBlock(blocks[0]);
		expect(tokenized.access).toBe('public');
	});

	it('should infer private access', () => {
		const source = `
/**
 * A thing		
 */
function _foo() {}`;
		const tokenizer = new Tokenizer();
		const blocks = tokenizer.scanSource(source);
		const tokenized = tokenizer.tokenizeBlock(blocks[0]);
		expect(tokenized.access).toBe('private');
	});

	it('should recognize @chainable', () => {
		const source = `
/**
 * @chainable		
 */
function foo() {}`;
		const tokenizer = new Tokenizer();
		const blocks = tokenizer.scanSource(source);
		const tokenized = tokenizer.tokenizeBlock(blocks[0]);
		expect(tokenized.chainable).toBe(true);
	});

	it('should recognize @deprecated', () => {
		const source = `
/**
 * @deprecated		
 */
function foo() {}`;
		const tokenizer = new Tokenizer();
		const blocks = tokenizer.scanSource(source);
		const tokenized = tokenizer.tokenizeBlock(blocks[0]);
		expect(tokenized.deprecated).toBe(true);
	});

	it('should recognize @version', () => {
		const source = `
/**
 * @version 1.0.0		
 */
function foo() {}`;
		const tokenizer = new Tokenizer();
		const blocks = tokenizer.scanSource(source);
		const tokenized = tokenizer.tokenizeBlock(blocks[0]);
		expect(tokenized.version).toBe('1.0.0');
	});

	it('should recognize @since', () => {
		const source = `
/**
 * @since 1.0.0		
 */
function foo() {}`;
		const tokenizer = new Tokenizer();
		const blocks = tokenizer.scanSource(source);
		const tokenized = tokenizer.tokenizeBlock(blocks[0]);
		expect(tokenized.since).toBe('1.0.0');
	});

	it('should recognize @todo', () => {
		const source = `
/**
 * @todo Refactor this 
 * @todo Add features		
 */
function foo() {}`;
		const tokenizer = new Tokenizer();
		const blocks = tokenizer.scanSource(source);
		const tokenized = tokenizer.tokenizeBlock(blocks[0]);
		expect(tokenized.todos).toEqual(['Refactor this', 'Add features']);
	});

	it('should recognize @see', () => {
		const source = `
/**
 * @see https://example.com/there
 * @see bar function
 */
function foo() {}`;
		const tokenizer = new Tokenizer();
		const blocks = tokenizer.scanSource(source);
		const tokenized = tokenizer.tokenizeBlock(blocks[0]);
		expect(tokenized.see).toEqual([
			'https://example.com/there',
			'bar function',
		]);
	});

	it('should recognize @throws', () => {
		const source = `
/**
 * @throws {Error} When max is not a number
 */
function foo(max) {}`;
		const tokenizer = new Tokenizer();
		const blocks = tokenizer.scanSource(source);
		const tokenized = tokenizer.tokenizeBlock(blocks[0]);
		expect(tokenized.throws).toEqual([
			{
				type: 'Error',
				description: 'When max is not a number',
				properties: [],
			},
		]);
	});

	it('should catch custom tags', () => {
		const source = `
/**
 * @foobar baz
 * @fizz buzz
 */
function foo(max) {}`;
		const tokenizer = new Tokenizer();
		const blocks = tokenizer.scanSource(source);
		const tokenized = tokenizer.tokenizeBlock(blocks[0]);
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
		const source = `
/**
 * @param {Object} options
 * @property {Boolean} doIt  If true, do the thing
 * @property {String} name  The thing name
 */
function foo(options) {}`;
		const tokenizer = new Tokenizer();
		const blocks = tokenizer.scanSource(source);
		const tokenized = tokenizer.tokenizeBlock(blocks[0]);
		expect(tokenized.params).toEqual([
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

	it('should parse a comment block', () => {
		const tokenizer = new Tokenizer();
		const blocks = tokenizer.scanSource(fixtureJs1Function);
		const tokenized = tokenizer.tokenizeBlock(blocks[0]);
		expect(tokenized).toMatchObject({
			name: 'bytesToText',
			description: 'Convert numeric bytes to a rounded number with label',
			examples: [
				{
					language: 'js',
					description: '',
					type: 'javadoc',
					text: 'bytesToText(23 * 1024 + 35); // 23.4 KB',
				},
			],
			params: [
				{
					type: 'Number',
					name: 'bytes',
					description: 'The number of bytes',
					required: true,
					default: undefined,
					properties: [],
				},
				{
					type: 'Number|String',
					name: 'precision',
					description: 'The decimal precision or "auto"',
					required: true,
					default: undefined,
					properties: [],
				},
			],
			returns: {
				type: 'String',
				description: '',
				properties: [],
			},
			customTags: [],
			type: 'function',
			subtype: null,
			signature: "bytesToText(bytes, precision = 'auto') ⇒ {String}",
			canAddDocgen: true,
		});
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
describe('Tokenizer._parseSignature', () => {
	it('should parse a function with no args', () => {
		const tokenizer = new Tokenizer();
		const signature = 'function foobar() {';
		const parsed = tokenizer._parseSignature(signature);
		expect(parsed.argsString).toEqual('');
		expect(parsed.params).toEqual([]);
	});
	it('should parse a function with one arg', () => {
		const tokenizer = new Tokenizer();
		const signature = 'function random(max) {';
		const parsed = tokenizer._parseSignature(signature);
		expect(parsed.argsString).toEqual('max');
		expect(parsed.params).toEqual([
			{
				type: undefined,
				name: 'max',
				description: '',
				required: true,
				default: undefined,
				properties: [],
			},
		]);
	});
	it('should parse a function with multiple args', () => {
		const tokenizer = new Tokenizer();
		const signature = `function foo(
	str = "a",
	num = 5,
	arr = [1, 2, 3],
	bool = true,
	obj = {"bar": "baz"},
	undef
) {`;
		const parsed = tokenizer._parseSignature(signature);
		expect(parsed.argsString).toEqual(
			`
	str = "a",
	num = 5,
	arr = [1, 2, 3],
	bool = true,
	obj = {"bar": "baz"},
	undef
`.trim()
		);
		expect(parsed.params).toEqual([
			{
				type: 'String',
				name: 'str',
				description: '',
				required: false,
				default: 'a',
				properties: [],
			},
			{
				type: 'Number',
				name: 'num',
				description: '',
				required: false,
				default: 5,
				properties: [],
			},
			{
				type: 'Array',
				name: 'arr',
				description: '',
				required: false,
				default: [1, 2, 3],
				properties: [],
			},
			{
				type: 'Boolean',
				name: 'bool',
				description: '',
				required: false,
				default: true,
				properties: [],
			},
			{
				type: 'Object',
				name: 'obj',
				description: '',
				required: false,
				default: { bar: 'baz' },
				properties: [],
			},
			{
				type: undefined,
				name: 'undef',
				description: '',
				required: true,
				default: undefined,
				properties: [],
			},
		]);
	});
});
