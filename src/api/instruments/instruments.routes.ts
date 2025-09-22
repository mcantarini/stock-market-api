import { Router, Request, Response } from 'express';
import { InstrumentService } from '../../domain/services/instrument';
import { parseSearchInstrumentsDTO } from './instruments.validators';

const router = Router();
const instrumentService = new InstrumentService();

// GET /instrument?search=
router.get('/', async (req: Request, res: Response) => {
  try {
    const parsed = parseSearchInstrumentsDTO(req.query);
    if (!parsed.ok) {
      return res.status(400).json({ error: 'Invalid request', issues: parsed.issues });
    }

    const instruments = await instrumentService.searchInstruments(parsed.dto.search);
    res.json(instruments);
  } catch (error) {
    console.error('Error searching instruments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export const instrumentsRouter = router;