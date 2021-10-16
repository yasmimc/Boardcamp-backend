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

		const categoryAlredyExists = await dataAlredyExists(
			"categories",
			"name",
			newCategory.name
		);

		if (categoryAlredyExists) {
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

app.get("/games", async (req, res) => {
	try {
		const name = req.query.name;
		if (name) {
			const result = await connection.query(
				`SELECT * FROM games WHERE name ~*$1;`,
				[name]
			);
			res.status(200).send(result.rows);
			return;
		}
		const result = await connection.query(`SELECT * FROM games`);
		res.status(200).send(result.rows);
	} catch (err) {
		res.sendStatus(500);
	}
});

app.post("/games", async (req, res) => {
	try {
		const newGame = req.body;
		const { name, image, stockTotal, categoryId, pricePerDay } = newGame;

		const categoryExists = await dataAlredyExists(
			"categories",
			"id",
			categoryId
		);

		const newGameIsValid =
			name && stockTotal > 0 && pricePerDay > 0 && categoryExists;

		if (!newGameIsValid) {
			res.sendStatus(400);
			return;
		}

		const gameAlredyExists = await dataAlredyExists("games", "name", name);

		if (gameAlredyExists) {
			res.sendStatus(409);
			return;
		}

		await connection.query(
			`INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5)`,
			[name, image, stockTotal, categoryId, pricePerDay]
		);
		res.sendStatus(201);
	} catch (err) {
		res.sendStatus(500);
	}
});

app.listen(4000);

async function dataAlredyExists(table, columnName, value) {
	const existentData = await connection.query(
		`SELECT * FROM ${table} WHERE ${columnName} = $1;`,
		[value]
	);
	if (existentData.rowCount !== 0) return true;
	return false;
}
