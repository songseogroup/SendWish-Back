import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { myvalue,connectionOptions } from 'src/app.module';

const databaseUsername =myvalue?.DB_USER_NAME;
const databasePassword =myvalue?.DB_PASSWORD;
const databaseName =myvalue?.DB_NAME;
const databaseHost =myvalue?.DB_HOST;
const databasePort = myvalue?.DB_PORT;
// Default to 'postgres' if DB_TYPE is not set, since we're parsing POSTGRES_URL
const databaseType = myvalue?.DB_TYPE || process.env.DB_TYPE || 'postgres';

console.log(connectionOptions)
console.log(myvalue)

//host:databaseHost|| connectionOptions.host,
// port:databasePort|| connectionOptions.port,
// username:databaseUsername|| connectionOptions.user,
// password: databasePassword||connectionOptions.password,
// database: databaseName||connectionOptions.database,

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: databaseType as any,
  host: connectionOptions?.host || databaseHost,
  port: connectionOptions?.port || databasePort || 5432,
  username: connectionOptions?.user || databaseUsername,
  password: connectionOptions?.password || databasePassword,
  database: connectionOptions?.database || databaseName,
  ssl: connectionOptions?.ssl || (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true,
  
};

