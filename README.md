# Project 1: User Registration, Sign-in and Search

A web app with a Node.js/Express backend, a MySQL database, and an HTML/JavaScript frontend.
Users can register, sign in, and search the user table in 8 different ways.
All SQL statements are in [sql.txt](sql.txt).

## Features
1. User registration (passwords are stored as salted scrypt hashes, never plain text)
2. User sign-in (parameterized queries, so it is safe from SQL injection)
3. Search by first and/or last name
4. Search by user ID (username)
5. Users whose salary is between X and Y
6. Users whose age is between X and Y
7. Users who registered after a given user (e.g. `john`)
8. Users who never signed in
9. Users who registered on the same day as a given user (e.g. `john`)
10. Users who registered today

## Project structure
```
Backend/
  app.js        Express routes (one per feature)
  dbService.js  All database queries
  seed.js       Creates the Users table and loads sample users
  dotenv        Database settings template, copy to .env
Frontend/
  index.html, index.js, stylesheet.css
sql.txt         Every SQL statement used
```

## Requirements
- Node.js 18 or newer
- MySQL 8 (or MariaDB from XAMPP)
- Optional: XAMPP Apache to serve the frontend

## How to set up and run
1. **Create the database.** In phpMyAdmin or MySQL Workbench, run:
   ```sql
   CREATE DATABASE web_app;
   ```
2. **Configure the backend.** In the `Backend` folder, copy `dotenv` to `.env`:
   ```
   cd Backend
   copy dotenv .env
   ```
   Edit `.env` and set `DB_USER` and `PASSWORD` to your MySQL login.
3. **Install dependencies.**
   ```
   npm install
   ```
4. **Create the table and load sample users.**
   ```
   npm run seed
   ```
   This creates the `Users` table and adds 9 sample users, including `john`.
   Their register days are relative to today, so every search has results.
   Each sample user's password is their username followed by `123`, for example `john` / `john123`.
5. **Start the backend.**
   ```
   npm start
   ```
   It listens on http://localhost:5050.
6. **Open the frontend.** Use either:
   - http://localhost:5050/ (the backend also serves the frontend), or
   - with XAMPP: put this project under `C:\xampp\htdocs\` and open
     `http://localhost/<folder>/Frontend/index.html`.

## API endpoints
| Method | URL | Feature |
|---|---|---|
| POST | `/register` | 1. Register (JSON body: username, password, firstname, lastname, salary, age) |
| POST | `/signin` | 2. Sign in (JSON body: username, password) |
| GET | `/users` | List all users |
| GET | `/search/name?firstname=&lastname=` | 3. Search by name |
| GET | `/search/userid/:username` | 4. Search by user ID |
| GET | `/search/salary?min=&max=` | 5. Salary range |
| GET | `/search/age?min=&max=` | 6. Age range |
| GET | `/search/registered-after/:username` | 7. Registered after a user |
| GET | `/search/never-signed-in` | 8. Never signed in |
| GET | `/search/same-day/:username` | 9. Registered on the same day as a user |
| GET | `/search/today` | 10. Registered today |

## How SQL injection is prevented
Every query uses `?` placeholders, for example:
```js
connection.query("SELECT password FROM Users WHERE username = ?;", [username]);
```
The driver sends the value separately from the SQL text, so input such as `' OR '1'='1` is
treated as a literal username and the sign-in fails. The password is then checked against the
stored hash in Node.js.

## Design notes
- `password` is `VARCHAR(255)` instead of `VARCHAR(50)` so it can hold the salt and hash.
- `registerday` is a `DATE`, so "registered after john" means a later day than john's register day.
- `signintime` is `NULL` until the user's first sign-in, which is how "never signed in" is found.
- The backend uses `mysql2` instead of `mysql` because `mysql` can't log in to MySQL 8.

## Troubleshooting
- Port 5050 already in use (Windows): `netstat -ano | findstr 5050`, then `taskkill /F /PID <pid>`.
- `Access denied` errors: check `DB_USER` and `PASSWORD` in `Backend/.env`.
