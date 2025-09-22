import { Router, Request, Response } from 'express';
import { OrderService } from '../../domain/services/order';
import { parseCreateOrderDTO } from './orders.validators';

const router = Router();
const orderService = new OrderService();

// POST /orders
router.post('/', async (req: Request, res: Response) => {
  const parsed = parseCreateOrderDTO(req.body)
  if (!parsed.ok) {
    return res.status(400).json({ error: 'Invalid request', issues: parsed.issues });
  }
  
  try {
    const order = await orderService.createOrder(parsed.dto);
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export const ordersRouter = router;