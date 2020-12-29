const extract = require('./extract.js');
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

describe('extract()', () => {
	it('should parse a function with one function', () => {
		const blocks = extract(fixtureJs1Function);
		expect(blocks).toMatchSnapshot();
	});

	it('should parse a function with two functions', () => {
		const blocks = extract(fixtureJs2Functions);
		expect(blocks).toMatchSnapshot();
	});
});
