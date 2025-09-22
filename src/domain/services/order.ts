import { OrderDAO } from '../../db/dao/order';
import { Order } from '../entities/order';
import { CreateOrderDTO, LimitOrder, MarketByAmount, MarketBySize } from '../types/order';
import { UserDAO } from '../../db/dao/user';
import { MarketDataDAO } from '../../db/dao/marketData';
import { ORDER_STATUS, ORDER_SIDE, ORDER_TYPE } from '../../shared/constants/order';
import { InstrumentDAO } from '../../db/dao/instrument';
import { PositionDAO } from '../../db/dao/position';

export class OrderService {
  private order: OrderDAO;
  private user: UserDAO;
  private marketData: MarketDataDAO;
  private instrument: InstrumentDAO;
  private position: PositionDAO;

  constructor() {
    this.order = new OrderDAO();
    this.user = new UserDAO();
    this.marketData = new MarketDataDAO();
    this.instrument = new InstrumentDAO();
    this.position = new PositionDAO();
  }

  async createOrder(dto: CreateOrderDTO): Promise<Order> {
    // Build order entity (calculates size, price, etc.)
    const orderEntity = await this.buildOrderEntity(dto);

    // Validate with complete order data
    await this.validateOrder(orderEntity);

    // Store order
    return await this.order.createOrder(orderEntity);
  }

  private async validateOrder(order: Order): Promise<void> {
    // User exists
    const user = await this.user.findUserById(order.userid!);
    if (!user) {
      throw new Error('User not found');
    }

    // Instrument exists
    const instrument = await this.instrument.findInstrumentById(order.instrumentid!);
    if (!instrument) {
      throw new Error('Instrument not found');
    }

    if (order.side === ORDER_SIDE.BUY) {
      // For BUY orders, validate user has sufficient funds
      const totalCost = parseFloat(order.price!) * (order.size || 1);

      const cashPosition = await this.position.getCashPosition(order.userid!);
      if (cashPosition < totalCost) {
        throw new Error(`Insufficient funds. Required: ${totalCost}, Available: ${cashPosition}`);
      }

    } else if (order.side === ORDER_SIDE.SELL) {
      // For SELL orders, validate user has sufficient stock
      const stockPosition = await this.position.getStockPosition(order.userid!, instrument.id);
      if (stockPosition < (order.size || 0)) {
        throw new Error(`Insufficient stock. Required: ${order.size}, Available: ${stockPosition}`);
      }

    } else if (order.side === ORDER_SIDE.CASH_OUT) {
      // For CASH_OUT, validate user has sufficient balance
      const withdrawAmount = parseFloat(order.price!);
      const cashPosition = await this.position.getCashPosition(order.userid!);
      if (cashPosition < withdrawAmount) {
        throw new Error(`Insufficient funds for withdrawal. Required: ${withdrawAmount}, Available: ${cashPosition}`);
      }
    }
    // CASH_IN doesn't need balance validation
  }

  private async buildOrderEntity(dto: CreateOrderDTO): Promise<Order> {
    const baseOrder = {
      instrumentid: dto.instrumentId,
      userid: dto.userId,
      side: dto.side,
      type: dto.type,
      datetime: new Date().toISOString()
    };

    if (dto.type === ORDER_TYPE.LIMIT) {
      return this.buildLimitOrder(dto as LimitOrder, baseOrder);
    }

    if ('amount' in dto) {
      return await this.buildMarketByAmountOrder(dto as MarketByAmount, baseOrder);
    }

    return await this.buildMarketBySizeOrder(dto as MarketBySize, baseOrder);
  }

  private buildLimitOrder(dto: LimitOrder, baseOrder: Partial<Order>): Order {
    return {
      ...baseOrder,
      size: dto.size,
      price: dto.limitPrice.toString(),
      status: ORDER_STATUS.NEW
    } as Order;
  }

  private async buildMarketByAmountOrder(dto: MarketByAmount, baseOrder: Partial<Order>): Promise<Order> {
    if (dto.side === ORDER_SIDE.CASH_IN || dto.side === ORDER_SIDE.CASH_OUT) {
      return {
        ...baseOrder,
        size: 0,
        price: dto.amount.toString(),
        status: ORDER_STATUS.FILLED
      } as Order;
    }

    // BUY or SELL - fetch close price
    const closePrice = await this.marketData.findLastClosePriceForInstrumentId(dto.instrumentId);
    const price = parseFloat(closePrice!.close!);
    const calculatedSize = Math.floor(dto.amount / price);

    return {
      ...baseOrder,
      size: calculatedSize,
      price: price.toString(),
      status: ORDER_STATUS.FILLED
    } as Order;
  }

  private async buildMarketBySizeOrder(dto: MarketBySize, baseOrder: Partial<Order>): Promise<Order> {
    const closePrice = await this.marketData.findLastClosePriceForInstrumentId(dto.instrumentId);
    const price = parseFloat(closePrice!.close!);

    return {
      ...baseOrder,
      size: dto.size,
      price: price.toString(),
      status: ORDER_STATUS.FILLED
    } as Order;
  }
}