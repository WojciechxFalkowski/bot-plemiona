export default () => {
	return {
		database: {
			root_user: process.env.DATABASE_ROOT_USER,
			root_password: process.env.DATABASE_ROOT_PASSWORD,
			database_name: process.env.DATABASE_NAME,
			host: process.env.DATABASE_HOST,
			port: process.env.DATABASE_PORT || 3307,
		},
		environment: {
			port: process.env.BACKEND_PORT
		},
		allowed: {
			origin: process.env.ALLOWED_ORIGIN,
		},
	}
};