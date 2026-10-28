// database services, accessible by DbService methods.

const mysql = require('mysql2');   // mysql2 supports MySQL 8 authentication (caching_sha2_password)
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config(); // read from .env file

let instance = null;

const connection = mysql.createConnection({
     host: process.env.HOST,
     user: process.env.DB_USER,
     password: process.env.PASSWORD,
     database: process.env.DATABASE,
     port: process.env.DB_PORT,
     dateStrings: true   // return DATE/DATETIME as plain strings, avoids timezone shifts
});

connection.connect((err) => {
     if(err){
        console.log(err.message);
     }
     console.log('db ' + connection.state);    // to see if the DB is connected or not
});

// columns we return to the frontend (never send the password hash back)
const USER_COLUMNS = "username, firstname, lastname, salary, age, registerday, signintime";

// run a parameterized query. Every value goes through a ? placeholder, so user
// input is never pasted into the SQL text -> no SQL injection.
function runQuery(query, params = []){
     return new Promise((resolve, reject) => {
          connection.query(query, params, (err, results) => {
               if(err) reject(new Error(err.message));
               else resolve(results);
          });
     });
}

// passwords are stored as "salt:hash" using scrypt, never in plain text
function hashPassword(password){
     const salt = crypto.randomBytes(16).toString('hex');
     const hash = crypto.scryptSync(password, salt, 64).toString('hex');
     return salt + ":" + hash;
}

function verifyPassword(password, stored){
     const [salt, hash] = stored.split(":");
     const candidate = crypto.scryptSync(password, salt, 64);
     return crypto.timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
}

class DbService{
    static getDbServiceInstance(){ // only one instance is sufficient
        return instance ? instance : (instance = new DbService());
    }

    // 1. user registration
    async registerUser({username, password, firstname, lastname, salary, age}){
        const query = `INSERT INTO Users (username, password, firstname, lastname, salary, age, registerday, signintime)
                       VALUES (?, ?, ?, ?, ?, ?, CURDATE(), NULL);`;
        await runQuery(query, [username, hashPassword(password), firstname, lastname, salary, age]);
        return this.searchByUsername(username);
    }

    // 2. user sign-in: look the user up by a parameterized query, check the hash,
    //    then record the sign-in time
    async signIn(username, password){
        const rows = await runQuery("SELECT password FROM Users WHERE username = ?;", [username]);
        if(rows.length === 0 || !verifyPassword(password, rows[0].password)) return null;

        await runQuery("UPDATE Users SET signintime = NOW() WHERE username = ?;", [username]);
        const user = await this.searchByUsername(username);
        return user[0];
    }

    async getAllUsers(){
        return runQuery(`SELECT ${USER_COLUMNS} FROM Users ORDER BY registerday, username;`);
    }

    // 3. search by first and/or last name (either one may be left empty)
    async searchByName(firstname, lastname){
        const conditions = [];
        const params = [];
        if(firstname){ conditions.push("firstname = ?"); params.push(firstname); }
        if(lastname){ conditions.push("lastname = ?"); params.push(lastname); }
        if(conditions.length === 0) return [];
        return runQuery(`SELECT ${USER_COLUMNS} FROM Users WHERE ${conditions.join(" AND ")};`, params);
    }

    // 4. search by userid (username)
    async searchByUsername(username){
        return runQuery(`SELECT ${USER_COLUMNS} FROM Users WHERE username = ?;`, [username]);
    }

    // 5. salary between X and Y
    async searchBySalary(min, max){
        return runQuery(`SELECT ${USER_COLUMNS} FROM Users WHERE salary BETWEEN ? AND ? ORDER BY salary;`, [min, max]);
    }

    // 6. age between X and Y
    async searchByAge(min, max){
        return runQuery(`SELECT ${USER_COLUMNS} FROM Users WHERE age BETWEEN ? AND ? ORDER BY age;`, [min, max]);
    }

    // 7. users who registered after the given user registered
    async registeredAfter(username){
        const query = `SELECT ${USER_COLUMNS} FROM Users
                       WHERE registerday > (SELECT registerday FROM Users WHERE username = ?)
                       ORDER BY registerday;`;
        return runQuery(query, [username]);
    }

    // 8. users who never signed in
    async neverSignedIn(){
        return runQuery(`SELECT ${USER_COLUMNS} FROM Users WHERE signintime IS NULL;`);
    }

    // 9. users who registered on the same day as the given user (excluding that user)
    async registeredSameDay(username){
        const query = `SELECT ${USER_COLUMNS} FROM Users
                       WHERE registerday = (SELECT registerday FROM Users WHERE username = ?)
                         AND username <> ?;`;
        return runQuery(query, [username, username]);
    }

    // 10. users who registered today
    async registeredToday(){
        return runQuery(`SELECT ${USER_COLUMNS} FROM Users WHERE registerday = CURDATE();`);
    }
}

DbService.runQuery = runQuery;
DbService.hashPassword = hashPassword;
DbService.connection = connection;

module.exports = DbService;
