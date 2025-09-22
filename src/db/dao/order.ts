import { db } from '../drizzle/client';
import { orders } from '../drizzle/schema/schema';
import { Order } from '../../domain/entities/order';
import { PositionDAO } from './position';
import { ORDER_STATUS, ORDER_SIDE } from '../../shared/constants/order';

export class OrderDAO {
  private position: PositionDAO;

  constructor() {
    this.position = new PositionDAO();
  }

  async createOrder(orderData: Order): Promise<Order> {
    return db.transaction(async (tx) => {
      const inserted = await tx.insert(orders)
        .values(orderData)
        .returning();
      if (!inserted[0]) {
        throw new Error('Failed to create order');
      }  

      const orderId = inserted[0].id
      const orderStatus = inserted[0].status
      const orderSide = orderData.side

      if (orderStatus === ORDER_STATUS.FILLED && (orderSide !== ORDER_SIDE.CASH_IN && orderSide !== ORDER_SIDE.CASH_OUT)){
          await this.position.upsertStockPosition(
            tx,
            inserted[0].userid!,
            inserted[0].instrumentid!,
            orderId,
            inserted[0].side!,
            inserted[0].size!,
            inserted[0].price!
          );
      }

      return inserted[0]
    })
  }
}