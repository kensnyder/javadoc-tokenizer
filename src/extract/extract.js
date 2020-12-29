const JsRegexParser = require('../JsRegexParser/JsRegexParser.js');
const Tokenizer = require('../Tokenizer/Tokenizer.js');

function extract(sourceCode, parser = null) {
	if (!parser) {
		parser = new JsRegexParser();
	}
	const blocks = parser.extractBlocks(sourceCode);
	const tokenizer = new Tokenizer();
	return blocks.map(block => tokenizer.tokenizeBlock(block));
}

module.exports = extract;
