function setupDemo(input, output, button) {
	input.addEventListener('paste', () => {
		output.innerHTML = 'Tokenizing...';
		setTimeout(run, 0);
	});
	button.addEventListener('click', async () => {
		button.disabled = true;
		await run();
		button.disabled = false;
	});
	async function run() {
		const functions = await tokenize(input.value);
		const json = JSON.stringify(functions, null, 4);
		output.innerHTML = Prism.highlight(json, Prism.languages.json, 'json');
	}
	output.innerHTML = Prism.highlight(
		'"Tokenized representation will display here"',
		Prism.languages.json,
		'json'
	);
}
async function tokenize(code) {
	try {
		const res = await fetch('/api/tokenize', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ code }),
		});
		const json = await res.json();
		return json;
	} catch (e) {
		return e.stack;
	}
}
console.log({ Prism });
