import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { myvalue,connectionOptions } from 'src/app.module';

const databaseUsername =myvalue.DB_USER_NAME;
const databasePassword =myvalue.DB_PASSWORD;
const databaseName =myvalue.DB_NAME;
const databaseHost =myvalue.DB_HOST;
const databasePort = myvalue.DB_PORT;
const databaseType=myvalue.DB_TYPE;

console.log(connectionOptions)
console.log(myvalue)

//host:databaseHost|| connectionOptions.host,
// port:databasePort|| connectionOptions.port,
// username:databaseUsername|| connectionOptions.user,
// password: databasePassword||connectionOptions.password,
// database: databaseName||connectionOptions.database,

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: databaseType,
  host:connectionOptions.host,
  port:connectionOptions.port,
  username:connectionOptions.user,
  password: connectionOptions.password,
  database: connectionOptions.database,
  ssl: require,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true,

};

