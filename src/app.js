import express from "express";
import cors from "cors";
import pg from "pg";
import dayjs from "dayjs";

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

// ------------------------------ * RENTALS CRUD *------------------------------

app.get("/rentals", async (req, res) => {
	try {
		const customerId = req.query.customerId;
		if (customerId) {
			const result = await connection.query(
				`SELECT 
					rentals.*,
					customers.name AS "customerName",
					games.name AS "gameName", 
					games."categoryId" AS "gameCategoryId",
					categories.name AS "gameCategoryName"
				FROM rentals 
				JOIN customers
					ON  rentals."customerId" = customers.id
				JOIN games 
					ON rentals."gameId" = games.id 
				JOIN categories 
					ON games."categoryId" = categories.id
				WHERE "customerId" = $1`,
				[customerId]
			);
			const rental = result.rows[0];
			res.send(rentalObj(rental));
			return;
		}

		const gameId = req.query.gameId;
		if (gameId) {
			const result = await connection.query(
				`SELECT 
					rentals.*,
					customers.name AS "customerName",
					games.name AS "gameName", 
					games."categoryId" AS "gameCategoryId",
					categories.name AS "gameCategoryName"
				FROM rentals 
				JOIN customers
					ON  rentals."customerId" = customers.id
				JOIN games 
					ON rentals."gameId" = games.id 
				JOIN categories 
					ON games."categoryId" = categories.id
				WHERE "gameId" = $1`,
				[gameId]
			);
			const rental = result.rows[0];
			res.send(rentalObj(rental));
			return;
		}

		const result = await connection.query(
			`SELECT 
				rentals.*,
				customers.name AS "customerName",
				games.name AS "gameName", 
				games."categoryId" AS "gameCategoryId",
				categories.name AS "gameCategoryName"
			FROM rentals 
			JOIN customers
				ON  rentals."customerId" = customers.id
			JOIN games 
				ON rentals."gameId" = games.id 
			JOIN categories 
				ON games."categoryId" = categories.id`
		);
		const rentals = result.rows.map((rental) => {
			return rentalObj(rental);
		});
		res.send(rentals);
	} catch (error) {
		res.sendStatus(500);
	}
});

app.post("/rentals", async (req, res) => {
	try {
		const { customerId, gameId, daysRented } = req.body;

		const customerExists = !!(await dataAlredyExists(
			"customers",
			"id",
			customerId
		));
		const gameExists = !!(await dataAlredyExists("games", "id", gameId));
		const daysRentedIsValid = daysRented > 0;

		if (!customerExists || !gameExists || !daysRentedIsValid) {
			res.sendStatus(400);
			return;
		}

		const game = (
			await connection.query(`SELECT * FROM games WHERE id = $1`, [gameId])
		).rows[0];

		const openRents = (
			await connection.query(
				`SELECT * from rentals WHERE "gameId" = $1 AND "returnDate" IS NULL`,
				[gameId]
			)
		).rowCount;

		const gameIsAvailable = openRents < game.stockTotal;

		if (!gameIsAvailable) {
			res.sendStatus(400);
			return;
		}

		const today = dayjs().format("YYYY-MM-DD");

		const originalPrice = game.pricePerDay * daysRented;

		const newRent = {
			customerId,
			gameId,
			daysRented,
			rentDate: today,
			returnDate: null,
			originalPrice,
			delayFee: null,
		};

		const { rentDate, returnDate, delayFee } = newRent;

		await connection.query(
			`INSERT INTO rentals (
				"customerId",
				"gameId",
				"daysRented",
				"rentDate",
				"returnDate",
				"originalPrice",
				"delayFee"
			) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			[
				customerId,
				gameId,
				daysRented,
				rentDate,
				returnDate,
				originalPrice,
				delayFee,
			]
		);

		res.sendStatus(201);
	} catch (error) {
		res.sendStatus(500);
	}
});

app.post("/rentals/:id/return", async (req, res) => {
	try {
		//nao pode devolver de novo, tem q implementar ainda
		const rentalId = req.params.id;

		const rentalExists = await dataAlredyExists("rentals", "id", rentalId);

		if (!rentalExists) {
			res.sendStatus(404);
			return;
		}

		const rental = (
			await connection.query(`SELECT * FROM rentals WHERE id = $1`, [rentalId])
		).rows[0];

		if (rental.returnDate) {
			res.sendStatus(400);
			return;
		}

		const today = dayjs().format("YYYY-MM-DD");
		const rentPeriod = dayjs().diff(rental.rentDate, "days");

		const delay =
			rentPeriod > rental.daysRented ? rentPeriod - rental.daysRented : null;
		const delayFee = delay
			? (rental.originalPrice / rental.daysRented) * delay
			: null;

		await connection.query(
			`UPDATE rentals 
				SET 
				"returnDate" = $1, 
				"delayFee" = $2 
			WHERE id = $3`,
			[today, delayFee, rentalId]
		);
		res.sendStatus(200);
	} catch (error) {
		res.sendStatus(500);
	}
});

app.delete("/rentals/:id", async (req, res) => {
	try {
		const rentalId = req.params.id;
		const rentalExists = await dataAlredyExists("rentals", "id", rentalId);
		if (!rentalExists) {
			res.sendStatus(404);
			return;
		}
		const rentalReturnDate = (
			await connection.query(`SELECT "returnDate" FROM rentals WHERE id = $1`, [
				rentalId,
			])
		).rows[0].returnDate;

		if (rentalReturnDate) {
			res.sendStatus(400);
			return;
		}
		connection.query(`DELETE FROM rentals WHERE id = $1`, [rentalId]);
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

function rentalObj(rental) {
	const rentDate = dayjs(rental.rentDate).format("YYYY-MM-DD");
	const returnDate = rental.returnDate
		? dayjs(rental.returnDate).format("YYYY-MM-DD")
		: null;
	return {
		id: rental.id,
		customerId: rental.customerId,
		gameId: rental.gameId,
		rentDate,
		daysRented: rental.daysRented,
		returnDate,
		originalPrice: rental.originalPrice,
		delayFee: rental.delayFee,
		customer: {
			id: rental.customerId,
			name: rental.customerName,
		},
		game: {
			id: rental.gameId,
			name: rental.gameName,
			categoryId: rental.gameCategoryId,
			categoryName: rental.gameCategoryName,
		},
	};
}
