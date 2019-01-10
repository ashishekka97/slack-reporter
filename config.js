module.exports = {
	port: 5000,
	db: {
    database: process.env.DB_NAME || 'sys',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    host: process.env.HOST || 'localhost'
  },
  slack: {
    url: 'https://hooks.slack.com/services/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'
  }
}