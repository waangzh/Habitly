import { loadLocalEnv } from '../config/load-env';
import { AppDataSource } from './data-source';

async function bootstrap(): Promise<void> {
  loadLocalEnv();
  await AppDataSource.initialize();
  await AppDataSource.undoLastMigration();
  await AppDataSource.destroy();
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
