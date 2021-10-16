import express from "express";
import cors from "cors";
import pg from "pg";

const { Pool } = pg;

const user = "bootcamp_role";
const password = "senha_super_hiper_ultra_secreta_do_role_do_bootcamp";
const host = "localhost";
const port = 5432;
const database = "boardcamp";

const connection = new Pool({
	user,
	password,
	host,
	port,
	database,
});

const app = express();
app.use(cors());
app.use(express.json());

app.get("/categories", async (req, res) => {
	try {
		const result = await connection.query(`SELECT * FROM categories;`);
		res.status(200).send(result.rows);
	} catch (err) {
		res.sendStatus(500);
	}
});

app.post("/categories", async (req, res) => {
	try {
		const newCategory = req.body;

		if (!newCategory || !newCategory.name) {
			res.sendStatus(400);
			return;
		}

		const existentCategory = await connection.query(
			`SELECT * FROM categories WHERE name = $1;`,
			[newCategory.name]
		);

		const categoryExists = existentCategory.rowCount !== 0;

		if (categoryExists) {
			res.sendStatus(409);
			return;
		}

		if (newCategory) {
			await connection.query(`INSERT INTO categories (name) VALUES ($1);`, [
				newCategory.name,
			]);
			res.sendStatus(201);
		}
	} catch (err) {
		res.sendStatus(500);
	}
});

app.listen(4000);
