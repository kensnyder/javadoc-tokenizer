const path = require('path');
const Hapi = require('@hapi/hapi');
const { extract } = require('../index.js');

const start = async () => {
	const server = Hapi.server({
		port: 3556,
		host: 'localhost',
		routes: {
			files: {
				relativeTo: path.join(__dirname, 'public'),
			},
		},
	});

	await server.register(require('@hapi/inert'));

	server.route({
		method: 'GET',
		path: '/{param*}',
		handler: {
			directory: {
				path: '.',
				redirectToSlash: true,
			},
		},
	});

	server.route({
		method: 'POST',
		path: '/api/tokenize',
		handler: request => {
			const { code } = request.payload;
			return extract(code);
		},
	});

	await server.start();

	console.log('Click to view demo:', server.info.uri);
};

process.on('unhandledRejection', err => {
	console.log(err);
	process.exit(1);
});

start();
