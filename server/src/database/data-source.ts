import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { loadLocalEnv } from '../config/load-env';
import { createTypeOrmDataSourceOptions } from './typeorm.config';

loadLocalEnv();

export const AppDataSource = new DataSource(createTypeOrmDataSourceOptions(process.env));
