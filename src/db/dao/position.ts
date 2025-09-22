import { db } from '../drizzle/client';
import { orders, stockPositions } from '../drizzle/schema/schema';
import { eq, and } from 'drizzle-orm';
import { ORDER_SIDE, ORDER_STATUS } from '../../shared/constants/order';

interface PositionUpdate {
  quantity: number;
  costBasis: number;
}

export class PositionDAO {
  private calculatePositionUpdate(
    currentQuantity: number,
    currentCostBasis: number,
    orderSide: string,
    orderSize: number,
    orderPrice: number
  ): PositionUpdate {
    let newQuantity: number;
    let newCostBasis: number;

    switch(orderSide) {
      case ORDER_SIDE.BUY: {
        // Increment position
        newQuantity = currentQuantity + orderSize;
        newCostBasis = currentCostBasis + (orderPrice * orderSize);
        break;
      }
      case ORDER_SIDE.SELL: {
        // Reduce position
        newQuantity = currentQuantity - orderSize;
        const avgPrice = currentQuantity > 0 ? currentCostBasis / currentQuantity : 0;
        newCostBasis = currentCostBasis - (avgPrice * orderSize);
        break;
      }
      default: {
        throw new Error(`Unsupported order side: ${orderSide}`);
      }
    }

    return { quantity: newQuantity, costBasis: newCostBasis };
  }

  async getStockPosition(userId: number, instrumentId: number): Promise<number> {
    const position = await db
      .select({
        quantity: stockPositions.quantity,
      })
      .from(stockPositions)
      .where(
        and(
          eq(stockPositions.userid, userId),
          eq(stockPositions.instrumentid, instrumentId)
        )
      )
      .limit(1);

    // Return 0 if no position exists, otherwise return the quantity
    return position[0]?.quantity || 0;
  }

  async getCashPosition(userId: number): Promise<number> {
    // Get all FILLED orders for this user
    const userOrders = await db
      .select({
        side: orders.side,
        size: orders.size,
        price: orders.price,
        instrumentid: orders.instrumentid
      })
      .from(orders)
      .where(
        and(
          eq(orders.userid, userId),
          eq(orders.status, ORDER_STATUS.FILLED)  // Only FILLED orders
        )
      );

    let totalCash = 0;

    for (const order of userOrders) {
      const price = parseFloat(order.price || '0');
      const size = order.size || 0;

      switch (order.side) {
        case ORDER_SIDE.CASH_IN:
          // User deposit money
          totalCash += price;
          break;

        case ORDER_SIDE.CASH_OUT:
          // User withdraw money
          totalCash -= price;
          break;

        case ORDER_SIDE.BUY:
          // User buy stocks
          totalCash -= size * price;
          break;

        case ORDER_SIDE.SELL:
          // User sold stocks
          totalCash += size * price;
          break;
      }
    }

    return totalCash;
  }

  async upsertStockPosition(tx: any, userId: number, instrumentId: number, orderId: number, side: string, size: number, price: string): Promise<void> {
    // Get current position record if it exists
    // Note that we already defined an index for user.id and instrument.id, so the search should be pretty fast.
    const existingPosition = await tx
      .select()
      .from(stockPositions)
      .where(
        and(
          eq(stockPositions.userid, userId),
          eq(stockPositions.instrumentid, instrumentId)
        )
      )
      .limit(1);

    const currentPos = existingPosition[0];
    const orderPrice = parseFloat(price);

    let newQuantity: number;
    let newCostBasis: number;

    if (!currentPos) {
      // First position for this user/instrument
      if (side === ORDER_SIDE.BUY) {
        const positionUpdate = this.calculatePositionUpdate(0, 0, side, size, orderPrice);
        newQuantity = positionUpdate.quantity;
        newCostBasis = positionUpdate.costBasis;
      } else {
        // IMPORTANT: For now, we'll just skip this case; we need to make sure all user positions are filled at some point.
        return
      }
    } else {
      // Update existing position incrementally
      const currentQuantity = currentPos.quantity || 0;
      const currentCostBasis = parseFloat(currentPos.costbasis || '0');

      const positionUpdate = this.calculatePositionUpdate(
        currentQuantity,
        currentCostBasis,
        side,
        size,
        orderPrice
      );

      newQuantity = positionUpdate.quantity;
      newCostBasis = positionUpdate.costBasis;
    }

    const now = new Date().toISOString();

    // Upsert position record
    await tx
      .insert(stockPositions)
      .values({
        userid: userId,
        instrumentid: instrumentId,
        quantity: newQuantity,
        costbasis: newCostBasis.toFixed(2),
        lastorderid: orderId, // might be useful for debugging purposes when checking the last order processed
        updatedat: now,
      })
      .onConflictDoUpdate({
        target: [stockPositions.userid, stockPositions.instrumentid],
        set: {
          quantity: newQuantity,
          costbasis: newCostBasis.toFixed(2),
          lastorderid: orderId,
          updatedat: now,
        },
      });
  }
}