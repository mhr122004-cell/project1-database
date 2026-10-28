// Creates the Users table and loads sample users for the demo.
// Run with: npm run seed
// Register days are relative to today, so the "today" / "same day" / "after john"
// searches always have something to show.

const DbService = require('./dbService');
const {runQuery, hashPassword, connection} = DbService;

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS Users(
   username VARCHAR(50) PRIMARY KEY,
   password VARCHAR(255) NOT NULL,
   firstname VARCHAR(50),
   lastname VARCHAR(50),
   salary FLOAT,
   age INTEGER,
   registerday DATE,
   signintime DATETIME
);`;

// [username, password, firstname, lastname, salary, age, days ago registered, signed in?]
const SAMPLE_USERS = [
    ["john",   "john123",  "John",    "Smith",   55000,  30, 10, true],
    ["mary",   "mary123",  "Mary",    "Smith",   72000,  28, 10, true],
    ["alice",  "alice123", "Alice",   "Johnson", 48000,  24, 10, false],
    ["bob",    "bob123",   "Bob",     "Brown",   91000,  45, 15, true],
    ["carlos", "carlos123","Carlos",  "Garcia",  63000,  35, 7,  false],
    ["diana",  "diana123", "Diana",   "Lee",     105000, 41, 3,  true],
    ["ethan",  "ethan123", "Ethan",   "Smith",   39000,  22, 1,  false],
    ["fatima", "fatima123","Fatima",  "Khan",    82000,  33, 0,  true],
    ["george", "george123","George",  "Miller",  58000,  52, 0,  false],
];

async function seed(){
    await runQuery(CREATE_TABLE);
    for(const [username, password, firstname, lastname, salary, age, daysAgo, signedIn] of SAMPLE_USERS){
        await runQuery(
            `REPLACE INTO Users (username, password, firstname, lastname, salary, age, registerday, signintime)
             VALUES (?, ?, ?, ?, ?, ?, DATE_SUB(CURDATE(), INTERVAL ? DAY), ${signedIn ? "NOW()" : "NULL"});`,
            [username, hashPassword(password), firstname, lastname, salary, age, daysAgo]
        );
    }
    console.log(`Seeded ${SAMPLE_USERS.length} users.`);
}

seed()
.catch(err => console.log(err.message))
.finally(() => connection.end());
