const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

dbPath = path.join(__dirname, "epimaxData.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log(`Server Running at http://localhost:3000/`);
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

//API: Register New User
app.post("/register/", async (request, response) => {
  const { username, password_hash } = request.body;

  const userCheckQuery = `
    SELECT * FROM User WHERE username = '${username}';`;
  const dbUser = await db.get(userCheckQuery);
  if (dbUser === undefined) {
    if (password_hash.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashPassword = await bcrypt.hash(password_hash, 10);
      const registerUserQuery = `
            INSERT INTO 
                User(username, password_hash)
            VALUES
                ('${username}', '${hashPassword}');`;
      await db.run(registerUserQuery);
      response.send("User created successfully on DB");
    }
  } else {
    response.status(400);
    response.send("User already exists in DB");
  }
});

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("JWT Token is Invalid");
  } else {
    jwt.verify(jwtToken, "SECRET_KEY", async (error, payLoad) => {
      if (error) {
        response.status(401);
        response.send("JWT Token is Invalid");
      } else {
        request.headers.username = payLoad.username;
        next();
      }
    });
  }
};

//  POST /tasks - Create a new task

app.post("/tasks", authenticateToken, async (request, response) => {
  const { tasks } = request.body;
  const {
    title,
    description,
    status,
    assignee_id,
    created_at,
    updated_at,
  } = request.headers;

  const query = `
    INSERT INTO 
        Tasks(title, description, status, assignee_id, created_at, updated_at)
    VALUES ('${title}', ${description}, ${status}, ${assignee_id}, ${updated_at});`;
  await db.run(query);
  response.send("Task Created");
});

//GET /tasks - Retrieve all tasks

app.get("/tasks", authenticateToken, async (request, response) => {
  const query = `
        SELECT *
        FROM Tasks`;
  const data = await db.all(query);
  response.send({ replies: data });
});

// GET /tasks/:id - Retrieve a specific task by ID
app.get("/tasks/:id/", authenticateToken, async (request, response) => {
  const { id } = request.params;
  const query = `
        SELECT *
        FROM Tasks id = ${id};`;

  const data = await db.all(query);

  response.send({ replies: data });
});

// PUT /tasks/:id - Update a specific task by ID
app.put("/tasks/:id/", authenticateToken, async (request, response) => {
  const { id } = request.params;
  const { description } = request.headers;

  const query = `
        UPDATE Tasks SET description  
= ${description} WHERE id = ${id};`;
  await db.run(query);
  response.send("Task Removed");
});

//DELETE /tasks/:id - Delete a specific task by ID

app.delete("/tasks/:id/", authenticateToken, async (request, response) => {
  const { id } = request.params;

  const query = `
        DELETE FROM Tasks
        WHERE id = ${id};`;
  await db.run(query);
  response.send("Task Removed");
});
