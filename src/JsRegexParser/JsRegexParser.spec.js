const JsRegexParser = require('./JsRegexParser.js');
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

describe('JsRegexParser.getContext', () => {
	it('should find classes', () => {
		const parser = new JsRegexParser();
		const context = parser.getContext('class MyClass {');
		expect(context).toEqual({
			type: 'class',
			subtype: null,
			name: 'MyClass',
			isAsync: null,
			argsString: null,
			canAddDocgen: false,
		});
	});
	it('should find functions', () => {
		const parser = new JsRegexParser();
		const context = parser.getContext('function(a) {');
		expect(context).toEqual({
			type: 'function',
			subtype: null,
			name: '',
			isAsync: false,
			argsString: 'a',
			canAddDocgen: false,
		});
	});
	it('should find constructor', () => {
		const parser = new JsRegexParser();
		const context = parser.getContext('constructor(b = 2) {');
		expect(context).toEqual({
			type: 'function',
			subtype: 'constructor',
			name: 'constructor',
			isAsync: false,
			argsString: 'b = 2',
			canAddDocgen: false,
		});
	});
	it('should find exported functions', () => {
		const parser = new JsRegexParser();
		const context = parser.getContext('export function(c = "5") {');
		expect(context).toEqual({
			type: 'function',
			subtype: null,
			name: '',
			isAsync: false,
			argsString: 'c = "5"',
			canAddDocgen: false,
		});
	});
	it('should find default exported functions', () => {
		const parser = new JsRegexParser();
		const context = parser.getContext(
			'export default async function(d = {}) {'
		);
		expect(context).toEqual({
			type: 'function',
			subtype: null,
			name: '',
			isAsync: true,
			argsString: 'd = {}',
			canAddDocgen: false,
		});
	});
	it('should find assigned functions', () => {
		const parser = new JsRegexParser();
		const context = parser.getContext('const a = async function(e = []) {');
		expect(context).toEqual({
			type: 'function',
			subtype: 'variable',
			name: 'a',
			isAsync: true,
			argsString: 'e = []',
			canAddDocgen: true,
		});
	});
	it('should find property functions', () => {
		const parser = new JsRegexParser();
		const context = parser.getContext('a.b = function(f = null) {');
		expect(context).toEqual({
			type: 'function',
			subtype: 'variable',
			name: 'a.b',
			isAsync: false,
			argsString: 'f = null',
			canAddDocgen: true,
		});
	});
	it('should find class methods', () => {
		const parser = new JsRegexParser();
		const context = parser.getContext('async method(g = false) {');
		expect(context).toEqual({
			type: 'function',
			subtype: 'method',
			name: 'method',
			isAsync: true,
			argsString: 'g = false',
			canAddDocgen: false,
		});
	});
	it('should find class property methods', () => {
		const parser = new JsRegexParser();
		const context = parser.getContext('method: async (h = undefined) => {');
		expect(context).toEqual({
			type: 'function',
			subtype: 'method',
			name: 'method',
			isAsync: true,
			argsString: 'h = undefined',
			canAddDocgen: false,
		});
	});
	it('should find class properties', () => {
		const parser = new JsRegexParser();
		const context = parser.getContext('this.max = 5;');
		expect(context).toEqual({
			type: 'variable',
			subtype: 'property',
			name: 'this.max',
			isAsync: null,
			argsString: null,
			canAddDocgen: false,
		});
	});
});

describe('JsRegexParser.extractBlocks', () => {
	it('should find 1 comment block', () => {
		const parser = new JsRegexParser();
		const blocks = parser.extractBlocks(fixtureJs1Function);
		expect(blocks).toMatchSnapshot();
	});
	it('should find 2 comment blocks', () => {
		const parser = new JsRegexParser();
		const blocks = parser.extractBlocks(fixtureJs2Functions);
		expect(blocks).toMatchSnapshot();
	});
});
