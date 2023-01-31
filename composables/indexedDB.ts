import { openDB, IDBPDatabase, DBSchema } from "@/pluginWrappers/idb";

// Database Name Constants
const FIREBASE_DB_NAME: string = "firebaseLocalStorageDb";
const USER_DB_NAME: string = "userLocalStorageDb";

interface ReadCreds {
  token: string;
  uid: string;
}
interface UserInfo extends DBSchema {
  "userInfo": { key: "karma"; value: number; };
}
interface UserLSDb extends DBSchema {
  "userLocalStorageDb": { key: string; value: Object; };
}
interface firebaseLS extends DBSchema {
  "firebaseLocalStorage": { key: string; value: Object; };
}
interface firebaseLSDb extends DBSchema {
  "firebaseLocalStorageDb": { key: string; value: Object; };
}

type IDBInterface = UserInfo | UserLSDb | firebaseLS | firebaseLSDb;

// This interface is used in openDB function
interface IndexedDBUpgradeOptions {
  upgrade?: (db: IDBPDatabase<IDBInterface>) => void;
  blocked?: () => void;
  blocking?: () => void;
  terminated?: () => void;
}

/**
 * Opens the specified database in indexed db
 *
 * @param {string} dbName Name of the database
 * @param {IndexedDBUpgradeOptions} IndexedDBUpgradeOptions: options for creation
 * updation or deletion of db, refer https://github.com/jakearchibald/idb#opendb for details
 *
 * @returns {Promise<IDBPDatabase<IDBInterface>>} a promise that resolves into an IDBDatabase instance of the specified db and rejects if it can't access the db
 * with the corresponding error
*/
const getDBPromise = (dbName: string, options?: IndexedDBUpgradeOptions): Promise<IDBPDatabase<IDBInterface>> => new Promise((resolve, reject) => {
  openDB(dbName, 1, options).then(resolve).catch(reject);
});

/**
 * Function opens and return an instance to Firebase indexed DB that holds firebase auth information
 *
 * @returns {Promise<IDBDatabase<IDBInterface>>} a promise that resolves into an IDBDatabase instance of the firebase
 * db and rejects if it can't access the db with the corresponding error
*/
const getFirebaseDB = (): Promise<IDBPDatabase<IDBInterface>> => getDBPromise(FIREBASE_DB_NAME);

/**
 * Function opens and return an instance to user indexed DB that holds additional
 * user information
 *
 * @returns {Promise<IDBDatabase>} a promise that resolves into an IDBDatabase instance of user db
 * and rejects if it can't access the db with the corresponding error
*/
const getUserDB = (): Promise<IDBPDatabase<IDBInterface>> => getDBPromise(USER_DB_NAME, {
  upgrade(db) {
    db.createObjectStore("userInfo");
  },
});

/**
 * Function to read Firebase auth credentials from Firebase Indexed DB
 * @return {Promise<ReadCreds>} - return type of function of readCreds
 */
export const readCreds = async (): Promise<ReadCreds> => {
  try {
    const db = await getFirebaseDB();
    const tx = db.transaction("firebaseLocalStorage", "readonly");
    const store = tx.objectStore("firebaseLocalStorage");
    const allRows = await store.getAll();
    const filteredRows = allRows.filter((obj) => obj.fbase_key.includes("firebase:authUser"));

    if (!filteredRows.length) {
      return {
        token: "",
        uid: "",
      };
    }

    const row = filteredRows[0];
    const token: string = row.value.stsTokenManager.accessToken;
    const { uid } = row.value as { uid: string; };
    return {
      token,
      uid,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(JSON.stringify(error));
  }
};

// Store EPF karma in userInfo datastore of User Indexed DB
export const storeKarma = async (karma: number): Promise<void> => {
  await (await getUserDB()).put("userInfo", karma, "karma");
};

// Read EPF karma in userInfo datastore of User Indexed DB
export const readKarma = async (): Promise<number> => {
  const karma: number = await (await getUserDB()).get("userInfo", "karma");
  return karma || 0;
};
