/**
 * Return a random integer between min and max inclusive
 * @param {Number} min  The lowest possible integer
 * @param {Number} max  The highest possible integer
 * @returns {Number}
 */
export default function random(min, max) {
	if (typeof min !== 'number' || typeof max !== 'number' || min >= max) {
		throw new Error('random(min, max) takes two Numbers in ascending order');
	}
	return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Return a random float between min and max exclusive
 * @param {Number} min  The lowest possible value
 * @param {Number} max  The highest possible value
 * @returns {Number}
 */
random.float = function (min, max) {
	if (typeof min !== 'number' || typeof max !== 'number' || min >= max) {
		throw new Error('random(min, max) takes two Numbers in ascending order');
	}
	return Math.random() * (max - min) + min;
};
