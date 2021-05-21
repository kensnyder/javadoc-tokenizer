const extract = require('./extract.js');
const fs = require('fs');
const JsRegexParser = require('../JsRegexParser/JsRegexParser.js');

const fixtureJs1Function = fs.readFileSync(
	`${__dirname}/../../test-fixtures/js-1-function.js`,
	'utf8'
);
const fixtureJs2Functions = fs.readFileSync(
	`${__dirname}/../../test-fixtures/js-2-functions.js`,
	'utf8'
);
const fixtureJsParamDefaults = fs.readFileSync(
	`${__dirname}/../../test-fixtures/js-param-defaults.js`,
	'utf8'
);

describe('extract()', () => {
	it('should parse a function with one function', () => {
		const blocks = extract(fixtureJs1Function);
		expect(blocks).toMatchSnapshot();
	});

	it('should parse a function with two functions', () => {
		const blocks = extract(fixtureJs2Functions);
		expect(blocks).toMatchSnapshot();
	});

	it('should parse a function with default param values', () => {
		const blocks = extract(fixtureJsParamDefaults, new JsRegexParser());
		expect(blocks).toMatchSnapshot();
	});
});
