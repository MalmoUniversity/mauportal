import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable('AuditLog', (table) => {
        table.increments('id').primary();
        table.datetime('timestamp').notNullable().defaultTo(knex.fn.now());
        table.string('user', 255).nullable(); // User identifier (nameID from session)
        table.string('url', 2000).notNullable(); // Request URL
        table.string('verb', 10).notNullable(); // HTTP method (GET, POST, etc.)
        table.text('body').nullable(); // Request body as JSON string
        table.string('ip', 45).nullable(); // IP address (supports IPv6)
        table.string('userAgent', 500).nullable(); // User agent string
        table.datetime('createdAt').notNullable().defaultTo(knex.fn.now());
        
        // Indexes for better query performance
        table.index('timestamp');
        table.index('user');
        table.index('verb');
        table.index('createdAt');
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTableIfExists('AuditLog');
}
