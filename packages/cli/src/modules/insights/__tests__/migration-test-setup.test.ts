import {
	createTeamProject,
	createWorkflow,
	testDb,
	testModules,
	createTestMigrationContext,
} from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { createMetadata } from '../database/entities/__tests__/db-utils';
import { InsightsByPeriodRepository } from '../database/repositories/insights-by-period.repository';
import { InsightsRawRepository } from '../database/repositories/insights-raw.repository';
import {
	BOUNDARY_TEST_VALUES,
	insertPreMigrationPeriodData,
	insertPreMigrationRawData,
} from './migration-test-setup';

beforeAll(async () => {
	await testModules.loadModules(['insights']);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate([
		'InsightsRaw',
		'InsightsByPeriod',
		'InsightsMetadata',
		'WorkflowEntity',
		'Project',
	]);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('Migration Test Setup Utilities', () => {
	test('insertPreMigrationRawData should insert boundary values correctly', async () => {
		const dataSource = Container.get(DataSource);
		const context = createTestMigrationContext(dataSource);
		const rawRepository = Container.get(InsightsRawRepository);
		const project = await createTeamProject();
		const workflow = await createWorkflow({}, project);
		const metadata = await createMetadata(workflow);

		const testValues = [
			BOUNDARY_TEST_VALUES.zero,
			BOUNDARY_TEST_VALUES.intMax,
			BOUNDARY_TEST_VALUES.negativeOne,
		];

		await insertPreMigrationRawData(context, metadata.metaId, testValues);

		const results = await rawRepository.find({ order: { id: 'ASC' } });
		expect(results).toHaveLength(3);
		expect(results[0].value).toBe(BOUNDARY_TEST_VALUES.zero);
		expect(results[1].value).toBe(BOUNDARY_TEST_VALUES.intMax);
		expect(results[2].value).toBe(BOUNDARY_TEST_VALUES.negativeOne);
	});

	test('insertPreMigrationPeriodData should insert boundary values correctly', async () => {
		const dataSource = Container.get(DataSource);
		const context = createTestMigrationContext(dataSource);
		const periodRepository = Container.get(InsightsByPeriodRepository);
		const project = await createTeamProject();
		const workflow = await createWorkflow({}, project);
		const metadata = await createMetadata(workflow);

		const testValues = [BOUNDARY_TEST_VALUES.intMin, BOUNDARY_TEST_VALUES.positiveOne];

		await insertPreMigrationPeriodData(context, metadata.metaId, testValues);

		const results = await periodRepository.find({ order: { id: 'ASC' } });
		expect(results).toHaveLength(2);
		expect(results[0].value).toBe(BOUNDARY_TEST_VALUES.intMin);
		expect(results[1].value).toBe(BOUNDARY_TEST_VALUES.positiveOne);
	});

	test('createTestMigrationContext should provide database-specific helpers', () => {
		const dataSource = Container.get(DataSource);
		const context = createTestMigrationContext(dataSource);

		// Verify context has required properties
		expect(context.tablePrefix).toBeDefined();
		expect(context.dbType).toBeDefined();
		expect(context.queryRunner).toBeDefined();
		expect(context.escape).toBeDefined();
		expect(context.escape.tableName).toBeInstanceOf(Function);
		expect(context.escape.columnName).toBeInstanceOf(Function);

		// Verify database type flags
		expect(typeof context.isSqlite).toBe('boolean');
		expect(typeof context.isMysql).toBe('boolean');
		expect(typeof context.isPostgres).toBe('boolean');

		// Verify at least one database type is active
		expect(context.isSqlite || context.isMysql || context.isPostgres).toBe(true);
	});
});
