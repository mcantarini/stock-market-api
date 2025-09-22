import request from 'supertest';
import express from 'express';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { users, instruments, orders, stockPositions, marketdata } from '../src/db/drizzle/schema/schema';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { ORDER_SIDE, ORDER_TYPE, ORDER_STATUS } from '../src/shared/constants/order';
import { DEFAULT_CURRENCY } from '../src/shared/constants/currency';
import { INSTRUMENT_TYPE } from '../src/shared/constants/instrument';

const app = express();
app.use(express.json());

describe('Stock Market API Functional Tests', () => {
  let container: StartedPostgreSqlContainer;
  let testDb: any;
  let testClient: any;
  let testUserId: number;
  let testInstrumentId: number;

  beforeAll(async () => {
    // Setup container db
    container = await new PostgreSqlContainer('postgres:15')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .withExposedPorts(5432)
      .start();

    const connectionString = container.getConnectionUri();
    process.env.DATABASE_URL = connectionString;
    testClient = postgres(connectionString);
    testDb = drizzle(testClient);

    // Run migrations on testDb
    console.log('Running migrations on test database...');
    try {
      await migrate(testDb, { migrationsFolder: 'src/db/drizzle/migrations' });
    } catch (error) {
      console.error('Migration error:', error);
    }

    // Setup API
    const { ordersRouter } = await import('../src/api/orders/orders.routes');
    const { userRouter } = await import('../src/api/users/users.routes');

    app.use('/orders', ordersRouter);
    app.use('/users', userRouter);

  }, 60000);

  afterAll(async () => {
    // Stop container
    try {
      const { pool } = await import('../src/db/drizzle/client');
      await pool.end();
    } catch (error) {
      // Ignore errors if pool is already closed for now
      // TODO: handler error here!
    }

    if (testClient) {
      await testClient.end();
    }
    if (container) {
      await container.stop();
    }
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await testDb.delete(stockPositions);
    await testDb.delete(orders);
    await testDb.delete(users);
    await testDb.delete(instruments);
    await testDb.delete(marketdata);
  });

  it('should complete full trading flow', async () => {
    // 1. Create a user to perform a buy operation
    const [user] = await testDb.insert(users).values({
      email: 'test_martin@example.com',
      accountnumber: 'ACC123456'
    }).returning();

    testUserId = user.id;
    expect(testUserId).toBeDefined();

    // 2. Create MONEDA instrument for ARS operations
    const [cashInstrument] = await testDb.insert(instruments).values({
      ticker: DEFAULT_CURRENCY,
      name: 'PESOS',
      type: INSTRUMENT_TYPE.MONEDA
    }).returning();

    // 3. Create YPF stock instrument
    const [instrument] = await testDb.insert(instruments).values({
      ticker: 'YPF',
      name: 'Yacimientos Petroliferos Fiscales',
      type: INSTRUMENT_TYPE.ACCIONES
    }).returning();

    testInstrumentId = instrument.id;
    expect(testInstrumentId).toBeDefined();

    // Add market data for YPF
    await testDb.insert(marketdata).values({
      instrumentid: testInstrumentId,
      date: '2025-09-20',
      open: 100.00,
      high: 100.00,
      low: 100.00,
      close: 100.00,
      previousclose: 100.00
    });

    // 4. Call /orders to fund USER account with 8000 ARS
    const cashInResponse = await request(app)
      .post('/orders')
      .send({
        instrumentId: cashInstrument.id,
        userId: testUserId,
        side: ORDER_SIDE.CASH_IN,
        type: ORDER_TYPE.MARKET,
        amount: 8000
      })
      .expect(201);

    expect(cashInResponse.body).toHaveProperty('id');
    expect(cashInResponse.body.side).toBe(ORDER_SIDE.CASH_IN);
    expect(cashInResponse.body.status).toBe(ORDER_STATUS.FILLED);

    // 5. Call /orders to buy YPF stocks
    const buyOrderResponse = await request(app)
      .post('/orders')
      .send({
        instrumentId: testInstrumentId,
        userId: testUserId,
        side: ORDER_SIDE.BUY,
        type: ORDER_TYPE.MARKET,
        size: 40
      })
      .expect(201);

    expect(buyOrderResponse.body).toHaveProperty('id');
    expect(buyOrderResponse.body.side).toBe(ORDER_SIDE.BUY);
    expect(buyOrderResponse.body.status).toBe(ORDER_STATUS.FILLED);

    // 6. Call /users/:id/portfolio to validate USER position
    const portfolioResponse = await request(app)
      .get(`/users/${testUserId}/portfolio`)
      .expect(200);

    const portfolio = portfolioResponse.body;

    // Validate user ARS balance: 8000 - (40 YPF × $100) = 4000 ARS
    expect(portfolio.cash.amount).toBe(4000);
    expect(portfolio.cash.currency).toBe(DEFAULT_CURRENCY);

    // Validate position
    expect(portfolio.instruments).toHaveLength(1);
    expect(portfolio.instruments[0].id).toBe(testInstrumentId);
    expect(portfolio.instruments[0].ticker).toBe('YPF');
    expect(portfolio.instruments[0].quantity).toBe(40);
    expect(portfolio.instruments[0].totalPosition.amount).toBe(4000);
    expect(portfolio.instruments[0].totalPosition.currency).toBe(DEFAULT_CURRENCY);

    // Change market data for YPF; there is an increment in the unit price
    await testDb.insert(marketdata).values({
      instrumentid: testInstrumentId,
      date: '2025-09-21',
      open: 100.00,
      high: 150.00,
      low: 100.00,
      close: 150.00,
      previousclose: 100.00
    });

    // 7. Call /orders to sell YPF stocks (sell 20 stocks)
    const sellOrderResponse = await request(app)
      .post('/orders')
      .send({
        instrumentId: testInstrumentId,
        userId: testUserId,
        side: ORDER_SIDE.SELL,
        type: ORDER_TYPE.MARKET,
        size: 20
      })
      .expect(201);

    expect(sellOrderResponse.body).toHaveProperty('id');
    expect(sellOrderResponse.body.side).toBe(ORDER_SIDE.SELL);
    expect(sellOrderResponse.body.status).toBe(ORDER_STATUS.FILLED);

    // 8. Call /users/:id/portfolio to validate final position after sell
    const finalPortfolioResponse = await request(app)
      .get(`/users/${testUserId}/portfolio`)
      .expect(200);

    const finalPortfolio = finalPortfolioResponse.body;

    // Validate user ARS balance: 4000 + (20 YPF × $150) = 7000 ARS
    expect(finalPortfolio.cash.amount).toBe(7000);
    expect(finalPortfolio.cash.currency).toBe(DEFAULT_CURRENCY);

    // Validate final position
    expect(finalPortfolio.instruments).toHaveLength(1);
    expect(finalPortfolio.instruments[0].id).toBe(testInstrumentId);
    expect(finalPortfolio.instruments[0].ticker).toBe('YPF');
    // Validate current quantity; Bought 40 stocks initially, and then sold 20 stocks
    expect(finalPortfolio.instruments[0].quantity).toBe(20);
    expect(finalPortfolio.instruments[0].totalPosition.amount).toBe(3000);
    expect(finalPortfolio.instruments[0].totalPosition.currency).toBe(DEFAULT_CURRENCY);
    // Validate final return; Buy 40 stocks at $100, and sell 20 stocks at $150
    expect(finalPortfolio.instruments[0].totalReturnPct).toBe(50);
  });
});