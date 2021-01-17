# javadoc-tokenizer

[![Build Status](https://travis-ci.com/kensnyder/javadoc-tokenizer.svg?branch=master&v=0.9.2)](https://travis-ci.com/kensnyder/javadoc-tokenizer)
[![Code Coverage](https://codecov.io/gh/kensnyder/javadoc-tokenizer/branch/master/graph/badge.svg?v=0.9.2)](https://codecov.io/gh/kensnyder/javadoc-tokenizer)
[![ISC License](https://img.shields.io/npm/l/javadoc-tokenizer.svg?v=0)](https://opensource.org/licenses/ISC)

Tokenize source code documentation created to document non-component functions
in StoryBook.js. StoryBook generates component documentations by adding a
`__docgenInfo` property to components. This package can add a `__docgenInfo` to
most functions.

## Installation

`npm install javadoc-tokenizer`

## Demo

Download and run `npm start`.

## Goals

1. Portable way to extract doc blocks into JSON objects. Other documentation
   tools such as [esdoc2](https://npmjs.com/package/esdoc2) do not have a way to
   use their tokenizers separately.
1. Support a wide range of common tags including `@property`
1. Normalize type names such as `bool => Boolean`
1. Extract default values specified in brackets
1. Generate simple signature strings such as
   `bytesToText(bytes, precision = 'auto') ⇒ {String}`

## Recognized tags

| Tag            | Output     | Description                                                      |
| -------------- | ---------- | ---------------------------------------------------------------- |
| `@name`        | `String`   | The name of the function (if not present, name will be inferred) |
| `@description` | `String`   | The name of the function (if not present, top text will be used) |
| `@param`       | `Object[]` | type, description, default value and properties of an argument   |
| `@property`    | `Object[]` | type, description and default value of an argument's property    |
| `@throws`      | `Object[]` | type, description and properties of an Error that may be thrown  |
| `@examples`    | `Object[]` | type, text, description and language of a code example           |
| `@access`      | `String`   | May be `public`, `private`, `protected` or a custom value        |
| `@api`         | `String`   | Alias for `@access`                                              |
| `@public`      | `String`   | Same as `@access public`                                         |
| `@private`     | `String`   | Same as `@access private`                                        |
| `@protected`   | `String`   | Same as `@access protected`                                      |
| `@chainable`   | `Boolean`  | True if function is chainable                                    |
| `@deprecated`  | `Boolean`  | True if function is deprecated                                   |
| `@version`     | `String`   | Function version                                                 |
| `@since`       | `String`   | Version of library when function was added                       |
| `@todo`        | `String[]` | A list of TODOs                                                  |
| `@see`         | `String[]` | A list of text/links for more information                        |
| `@returns`     | `Object`   | type, description and properties of the return value             |
| `@ignore`      | `Boolean`  | True if function should be omitted from displayed documentation  |

Note: Other tags will be put into a `customTags` array.

## Usage

Tokenize source code

```js
const fs = require('fs');
const { extract } = require('javadoc-tokenizer');

let src = fs.readFileSync(path, 'utf8');
const functionDocs = extract(src);
```

Add a `__docgenInfo` property to all functions possible

```js
const fs = require('fs');
const { getDocgenCode } = require('javadoc-tokenizer');

let src = fs.readFileSync(path, 'utf8');
const docgenCode = getDocgenCode(src);
if (docgenCode) {
	src += '\n\n' + docgenCode;
}
```

## Example Input and Output

Input:

```js
/**
 * Convert numeric bytes to a rounded number with label
 * @example
 * bytesToText(23 * 1024 + 35); // 23.4 KB
 * @param {Number} bytes  The number of bytes
 * @param {Number|String} precision  The decimal precision or "auto"
 * @returns {String}
 */
export default function bytesToText(bytes, precision = 'auto') {
	// ...
}
```

Output:

```js
[
	{
		access: 'public',
		canAddDocgen: true,
		chainable: null,
		contextCode:
			"export default function bytesToText(bytes, precision = 'auto')",
		customTags: [],
		deprecated: null,
		description: 'Convert numeric bytes to a rounded number with label',
		examples: [
			{
				description: '',
				language: 'js',
				text: 'bytesToText(23 * 1024 + 35); // 23.4 KB',
				type: 'javadoc',
			},
		],
		ignore: false,
		name: 'bytesToText',
		params: [
			{
				default: undefined,
				description: 'The number of bytes',
				name: 'bytes',
				properties: [],
				required: true,
				type: 'Number',
			},
			{
				default: undefined,
				description: 'The decimal precision or "auto"',
				name: 'precision',
				properties: [],
				required: true,
				type: 'Number|String',
			},
		],
		returns: {
			description: '',
			properties: [],
			type: 'String',
		},
		see: [],
		signature: "bytesToText(bytes, precision = 'auto') ⇒ {String}",
		since: null,
		subtype: null,
		throws: [],
		todos: [],
		type: 'function',
		version: null,
	},
];
```

## Limitations

1. Only tested on JavaScript
1. Uses regular expressions instead of code tokenization
1. Tokenizer is not aware of context; e.g. the name of the class they belong to

### Unit Tests and Code Coverage

Powered by jest

```bash
npm test
npm run coverage
```

## Contributing

Contributions are welcome. Please open a GitHub ticket for bugs or feature
requests. Please make a pull request for any fixes or new code you'd like to be
incorporated.

## License

Open Source under the [ISC License](https://opensource.org/licenses/ISC).
