/**
 * Convert numeric bytes to a rounded number with label
 * @example
 * visitUrl('/', 3000) // visit URL after 3 seconds
 * @param {String} [url=window.location.href]  The URL to visit
 * @param {Number} [delay=5000]  The delay before visiting
 * @returns {String}
 */
export default function visitUrl(url = window.location.href, delay = 5000) {
	document.querySelector('.snackbar').textContent = `Navigating to ${url}...`;
	setTimeout(() => {
		window.location.href = url;
	}, delay);
}

/**
 * @ignore
 * @see http://example.com/foobar
 * @param foo
 */
function ignoreMe(foo) {}
