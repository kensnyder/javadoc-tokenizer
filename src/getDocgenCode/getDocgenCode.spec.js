const getDocgenCode = require('./getDocgenCode.js');
const fs = require('fs');
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

describe('getDocgenCode()', () => {
	it('should generate code for file with one function', () => {
		const code = getDocgenCode(fixtureJs1Function);
		expect(code).toMatch(/try/);
		expect(code).toMatchSnapshot();
	});
	it('should generate code for file with two functions', () => {
		const code = getDocgenCode(fixtureJs2Functions);
		expect(code).toMatch(/try[\s\S]+try/);
		expect(code).toMatchSnapshot();
	});
	it('should generate code a function with default params', () => {
		const code = getDocgenCode(fixtureJsParamDefaults);
		expect(code).toMatch(/try/);
		expect(code).toMatchSnapshot();
	});
});
