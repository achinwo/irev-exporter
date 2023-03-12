require('dotenv').config();

const path = require('path');

export const migrations = {
    directory: path.resolve(__dirname, './db/migrations')
};

export const seeds = {
    directory: path.resolve(__dirname, './db/seeds')
};

export const pool = {
    min: 0
};


module.exports = {
    test: {
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: './db/test.db'
        },
        migrations
    },
    development: {
        client: 'pg',
        connection: {
            port: process.env.DB_PORT,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            pool: { min: 0, max: 7 }
        },
        pool,
        migrations,
        seeds
    },
    production: {
        client: 'pg',
        connection: {
            port: process.env.DB_PORT,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            // ssl: Object.assign({ rejectUnauthorized: false }, certificates),
            pool: { min: 0, max: 7 }
        },
        pool,
        migrations,
        seeds
    }
};

