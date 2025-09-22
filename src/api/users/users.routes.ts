import { Router, Request, Response } from 'express';
import { PortfolioService } from '../../domain/services/portfolio';
import { parseUserPortfolioDTO } from './users.validators';

const router = Router();
const portfolioService = new PortfolioService();

// GET /users/:id/portfolio
router.get('/:id/portfolio', async (req: Request, res: Response) => {
  try {
    const parsed = parseUserPortfolioDTO(req.params);
    if (!parsed.ok) {
      return res.status(400).json({ error: 'Invalid request', issues: parsed.issues });
    }

    const portfolio = await portfolioService.getUserPortfolio(parsed.dto.id);
    res.json(portfolio);
  } catch (error) {
    console.error('Error getting user portfolio:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export const userRouter = router;