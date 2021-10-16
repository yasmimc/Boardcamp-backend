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

// ------------------------------ * CATEGORIES CRUD *------------------------------

app.get("/categories", async (req, res) => {
	try {
		const result = await connection.query(`SELECT * FROM categories;`);
		res.status(200).send(result.rows);
	} catch (error) {
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
	} catch (error) {
		res.sendStatus(500);
	}
});

// ------------------------------ * GAMES CRUD *------------------------------

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
	} catch (error) {
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
	} catch (error) {
		res.sendStatus(500);
	}
});

// ------------------------------ * CUSTOMERS CRUD *------------------------------

app.get("/customers", async (req, res) => {
	try {
		const cpf = req.query.cpf;
		if (cpf) {
			const result = await connection.query(
				`SELECT * FROM customers WHERE cpf = $1`,
				[cpf]
			);
			res.status(200).send(result.rows);
			return;
		}

		const result = await connection.query(`SELECT * FROM customers`);
		res.status(200).send(result.rows);
	} catch (error) {
		res.sendStatus(500);
	}
});

app.get("/customers/:id", async (req, res) => {
	try {
		const customerId = req.params.id;
		const result = await connection.query(
			`SELECT * FROM customers WHERE id = $1`,
			[customerId]
		);

		if (result.rowCount === 0) {
			res.sendStatus(404);
			return;
		}

		res.status(200).send(result.rows);
	} catch (error) {
		res.sendStatus(500);
	}
});

app.post("/customers", async (req, res) => {
	try {
		const newCustomer = req.body;
		const { name, phone, cpf, birthday } = newCustomer;

		if (!customerIsValid(newCustomer)) {
			res.sendStatus(400);
			return;
		}
		const customerAlredyExists = await dataAlredyExists(
			"customers",
			"cpf",
			cpf
		);
		if (customerAlredyExists) {
			res.sendStatus(409);
			return;
		}

		await connection.query(
			`INSERT INTO customers (name, phone, cpf, birthday) VALUES($1, $2, $3, $4)`,
			[name, phone, cpf, birthday]
		);
		res.sendStatus(201);
	} catch (error) {
		res.sendStatus(500);
	}
});

app.put("/customers/:id", async (req, res) => {
	try {
		const customerId = req.params.id;
		const customer = await connection.query(
			`SELECT * FROM customers WHERE id = $1`,
			[customerId]
		);

		if (customer.rowCount === 0) {
			res.sendStatus(404);
			return;
		}

		const updatedCustomer = req.body;
		const { name, phone, cpf, birthday } = updatedCustomer;

		if (!customerIsValid(updatedCustomer)) {
			res.sendStatus(400);
			return;
		}
		const updatedCustomerAlredyExists = await dataAlredyExists(
			"customers",
			"cpf",
			cpf
		);

		const thisIsAnotherCustomerCpf =
			updatedCustomerAlredyExists &&
			updatedCustomerAlredyExists.id !== customerId;

		if (thisIsAnotherCustomerCpf) {
			res.sendStatus(409);
			return;
		}
		await connection.query(
			`UPDATE customers SET 
				name = $1,
				phone = $2,
				cpf = $3,
				birthday = $4
			WHERE id = $5`,
			[name, phone, cpf, birthday, customerId]
		);

		res.sendStatus(200);
	} catch (error) {
		res.sendStatus(500);
	}
});

app.listen(4000);

async function dataAlredyExists(table, columnName, value) {
	const existentData = await connection.query(
		`SELECT * FROM ${table} WHERE ${columnName} = $1;`,
		[value]
	);
	if (existentData.rowCount !== 0) return existentData.rows;
	return false;
}

function dateIsValid(date) {
	const checkDate = new Date(date);
	return checkDate instanceof Date && !isNaN(checkDate);
}

function customerIsValid(newCustomer) {
	const { phone, cpf, birthday } = newCustomer;

	const cpfRegex = /^\d{3}.?\d{3}.?\d{3}-?\d{2}$/;
	const phoneRegex = /(^[0-9]{2})(\s|-)?(9?[0-9]{4})-?([0-9]{4}$)/;
	const dateRegex = /([0-9]{4})-?([0-9]{2})-?([0-9]{2})/;

	const newCustomerIsValid =
		cpfRegex.test(cpf) &&
		phoneRegex.test(phone) &&
		dateRegex.test(birthday) &&
		dateIsValid(birthday);

	return newCustomerIsValid;
}
