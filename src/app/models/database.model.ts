import { DBConfig, provideIndexedDb } from 'ngx-indexed-db';

export const dbConfig: DBConfig = {
  name: 'DIComicsDB',
  version: 1,
  objectStoresMeta: [{
    store: 'comics',
    storeConfig: { keyPath: 'id', autoIncrement: true },
    storeSchema: [
      { name: 'name', keypath: 'name', options: { unique: false } },
      { name: 'path', keypath: 'path', options: { unique: true } }
    ]
  },{
    store: 'metadata',
    storeConfig: { keyPath: 'id', autoIncrement: true },
    storeSchema: [
      { name: 'name', keypath: 'name', options: { unique: false } },
      { name: 'path', keypath: 'path', options: { unique: true } }
    ]
  }]
};