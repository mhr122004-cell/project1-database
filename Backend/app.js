// Backend: application services, accessible by URIs

const express = require('express')
const cors = require('cors')
const path = require('path')
const dotenv = require('dotenv')
dotenv.config()

const app = express();

const dbService = require('./dbService');

app.use(cors());
app.use(express.json())
app.use(express.urlencoded({extended: false}));

// also serve the Frontend, so http://localhost:5050/ works without Apache
app.use(express.static(path.join(__dirname, '..', 'Frontend')));

// wrap a DB call: send its result as {data: ...}, or a 500 error as {error: ...}
function handle(response, promise){
    promise
    .then(data => response.json({data: data}))
    .catch(err => {
        console.log(err);
        response.status(500).json({error: err.message});
    });
}

// 1. registration
app.post('/register', (request, response) => {
    const {username, password, firstname, lastname, salary, age} = request.body;
    if(!username || !password){
        return response.status(400).json({error: "Username and password are required."});
    }
    const db = dbService.getDbServiceInstance();

    db.registerUser({username, password, firstname, lastname,
                     salary: salary === "" ? null : salary,
                     age: age === "" ? null : age})
    .then(data => response.json({data: data}))
    .catch(err => {
        const taken = err.message.includes("Duplicate entry");
        response.status(taken ? 409 : 500)
                .json({error: taken ? "That username is already taken." : err.message});
    });
});

// 2. sign-in
app.post('/signin', (request, response) => {
    const {username, password} = request.body;
    const db = dbService.getDbServiceInstance();

    db.signIn(username || "", password || "")
    .then(user => {
        if(user) response.json({data: user});
        else response.status(401).json({error: "Invalid username or password."});
    })
    .catch(err => response.status(500).json({error: err.message}));
});

app.get('/users', (request, response) => {
    handle(response, dbService.getDbServiceInstance().getAllUsers());
});

// 3. search by first and/or last name: /search/name?firstname=..&lastname=..
app.get('/search/name', (request, response) => {
    const {firstname, lastname} = request.query;
    handle(response, dbService.getDbServiceInstance().searchByName(firstname, lastname));
});

// 4. search by userid
app.get('/search/userid/:username', (request, response) => {
    handle(response, dbService.getDbServiceInstance().searchByUsername(request.params.username));
});

// 5. salary between X and Y: /search/salary?min=..&max=..
app.get('/search/salary', (request, response) => {
    const {min, max} = request.query;
    handle(response, dbService.getDbServiceInstance().searchBySalary(min, max));
});

// 6. age between X and Y: /search/age?min=..&max=..
app.get('/search/age', (request, response) => {
    const {min, max} = request.query;
    handle(response, dbService.getDbServiceInstance().searchByAge(min, max));
});

// 7. registered after a user
app.get('/search/registered-after/:username', (request, response) => {
    handle(response, dbService.getDbServiceInstance().registeredAfter(request.params.username));
});

// 8. never signed in
app.get('/search/never-signed-in', (request, response) => {
    handle(response, dbService.getDbServiceInstance().neverSignedIn());
});

// 9. registered on the same day as a user
app.get('/search/same-day/:username', (request, response) => {
    handle(response, dbService.getDbServiceInstance().registeredSameDay(request.params.username));
});

// 10. registered today
app.get('/search/today', (request, response) => {
    handle(response, dbService.getDbServiceInstance().registeredToday());
});

const PORT = process.env.PORT || 5050;
app.listen(PORT,
    () => {
        console.log("I am listening on the configured port " + PORT)
    }
);
