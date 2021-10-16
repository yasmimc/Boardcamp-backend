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

		const categories = await connection.query(`SELECT * FROM categories;`).rows;

		const thisCategoryExists = !categories.find((category) => {
			category.name === newCategory.name;
		});

		if (newCategory && !thisCategoryExists) {
			await connection.query(`INSERT INTO categories (name) VALUES ($1);`, [
				newCategory.name,
			]);
			res.sendStatus(201);
		}
	} catch (err) {
		if (!newCategory) {
			res.sendStatus(400);
			return;
		}
		if (thisCategoryExists) {
			res.sendStatus(409);
			return;
		}
		res.sendStatus(500);
	}
});

app.listen(4000);
