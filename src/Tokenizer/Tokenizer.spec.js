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
			canAddDocgen: false,
		});
	});
	it('should find default exported functions', () => {
		const tokenizer = new Tokenizer();
		const context = tokenizer.getContext('export default function(a) {');
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
			canAddDocgen: false,
		});
	});
	it('should find assigned functions', () => {
		const tokenizer = new Tokenizer();
		const context = tokenizer.getContext('const a = function(b) {');
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
			canAddDocgen: true,
		});
	});
	it('should find class methods', () => {
		const tokenizer = new Tokenizer();
		const context = tokenizer.getContext('method(a) {');
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
			canAddDocgen: false,
		});
	});
	it('should find class property methods', () => {
		const tokenizer = new Tokenizer();
		const context = tokenizer.getContext('method: (a) => {');
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
			params: null,
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
fdescribe('Tokenizer.tokenizeBlock', () => {
	it('should handle ignore', () => {
		const source = `/**
* @ignore 		
*/
function foo() {}`;
		const tokenizer = new Tokenizer();
		const blocks = tokenizer.scanSource(source);
		const tokenized = tokenizer.tokenizeBlock(blocks[0]);
		expect(tokenized.ignore).toBe(true);
	});

	fit('should handle description', () => {
		const source = `/**
* @desc Does stuff		
*/
function foo() {}`;
		const tokenizer = new Tokenizer();
		const blocks = tokenizer.scanSource(source);
		const tokenized = tokenizer.tokenizeBlock(blocks[0]);
		expect(tokenized.name).toBe('foo');
		expect(tokenized.description).toBe('Does stuff');
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
				type: undefined,
				description: '',
				properties: [],
			},
			customTags: [],
			type: 'function',
			subtype: null,
			canAddDocgen: true,
		});
	});
	// it('should parse 2 comment blocks', () => {
	// 	const tokenizer = new Tokenizer();
	// 	const blocks = tokenizer.scanSource(fixtureJs2Functions);
	// 	const block0 = tokenizer.tokenizeBlock(blocks[0]);
	// 	const block1 = tokenizer.tokenizeBlock(blocks[1]);
	// 	expect(block0.description).toBe(
	// 		'Return a random integer between min and max inclusive'
	// 	);
	// 	expect(block1.description).toBe(
	// 		'Return a random float between min and max exclusive'
	// 	);
	// });
	// 	it('should parse block completely', () => {
	// 		const tokenizer = new Tokenizer();
	// const comment = `/**
	//  *
	//  *
	//  *
	//  *
	//  *
	//  */`;
	// 		const block = tokenizer.tokenizeBlock({
	// 			comment,
	// 			context:
	// 		});
	// 		expect(block).toEqual({
	//
	// 		});
	// 	});
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
describe('Tokenizer._parseSignature', () => {
	it('should parse a function with no args', () => {
		const tokenizer = new Tokenizer();
		const signature = 'function foobar() {';
		const parsed = tokenizer._parseSignature(signature);
		expect(parsed).toEqual([]);
	});
	it('should parse a function with one arg', () => {
		const tokenizer = new Tokenizer();
		const signature = 'function random(max) {';
		const parsed = tokenizer._parseSignature(signature);
		expect(parsed).toEqual([
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
		expect(parsed).toEqual([
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
