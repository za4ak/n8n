import { DbConnection, wrapMigration, type Migration } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

async function reinitializeDataSource(): Promise<void> {
	await Container.get(DbConnection).close();
	await Container.get(DbConnection).init();
}

/**
 * Wrap migrations only if not already wrapped to prevent double-wrapping.
 */
function wrapMigrationsOnce(migrations: Migration[]): void {
	for (const migration of migrations) {
		wrapMigration(migration);
	}
}

/**
 * Initialize database and run all migrations up to (but not including) the specified migration.
 * Useful for testing data transformations by inserting test data before a migration runs.
 *
 * @param beforeMigrationName - The class name of the migration to stop before (e.g., 'AddUserRole1234567890')
 * @throws {UnexpectedError} If the migration is not found or database is not initialized
 */
export async function initDbUpToMigration(beforeMigrationName: string): Promise<void> {
	const dataSource = Container.get(DataSource);

	const allMigrations = dataSource.options.migrations as Migration[];
	const targetIndex = allMigrations.findIndex((m) => m.name === beforeMigrationName);

	if (targetIndex === -1) {
		throw new UnexpectedError(`Migration "${beforeMigrationName}" not found`);
	}

	// Temporarily replace migrations array with subset
	const migrationsToRun = allMigrations.slice(0, targetIndex);
	(dataSource.options as { migrations: Migration[] }).migrations = migrationsToRun;

	try {
		// Need to reinitialize the data source to rebuild the migrations
		await reinitializeDataSource();
		// Wrap and run migrations
		wrapMigrationsOnce(migrationsToRun);
		await dataSource.runMigrations({
			transaction: 'each',
		});
	} finally {
		// Restore full migrations array
		(dataSource.options as { migrations: Migration[] }).migrations = allMigrations;
		// Need to reinitialize the data source to rebuild the migrations
		await reinitializeDataSource();
	}
}

/**
 * Run a single migration by name.
 * Useful for testing a specific migration after inserting test data.
 *
 * @param migrationName - The class name of the migration to run (e.g., 'AddUserRole1234567890')
 * @throws {UnexpectedError} If the migration is not found or database is not initialized
 */
export async function runSingleMigration(migrationName: string): Promise<void> {
	const dataSource = Container.get(DataSource);

	const allMigrations = dataSource.options.migrations as Migration[];
	const migration = allMigrations.find((m) => m.name === migrationName);

	if (!migration) {
		throw new UnexpectedError(`Migration "${migrationName}" not found`);
	}

	// Temporarily replace migrations array with only the target migration
	(dataSource.options as { migrations: Migration[] }).migrations = [migration];

	try {
		// Need to reinitialize the data source to rebuild the migrations
		await reinitializeDataSource();
		wrapMigrationsOnce([migration]);
		await dataSource.runMigrations({
			transaction: 'each',
		});
	} finally {
		// Restore full migrations array
		(dataSource.options as { migrations: Migration[] }).migrations = allMigrations;
		// Need to reinitialize the data source to rebuild the migrations
		await reinitializeDataSource();
	}
}
