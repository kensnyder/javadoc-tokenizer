import ensure from '../ensure/ensure.js';

const suffixes = ['b', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

/**
 * Convert numeric bytes to a rounded number with label
 * @example
 * bytesToText(23 * 1024 + 35); // 23.4 KB
 * @param {Number} bytes  The number of bytes
 * @param {Number|String} precision  The decimal precision or "auto"
 * @returns {String}
 */
export default function bytesToText(bytes, precision = 'auto') {
	let power = 0;
	while (bytes >= 1000) {
		bytes /= 1024;
		power++;
	}
	const num = ensure.finite(bytes);
	if (power === 0) {
		precision = 0;
	} else if (precision === 'auto') {
		if (num > 100) {
			precision = 0;
		} else if (num > 10) {
			precision = 1;
		} else {
			precision = 2;
		}
	}
	precision = ensure.integer(precision);
	return num.toFixed(precision) + ' ' + suffixes[power];
}
