import { InstrumentDAO } from '../../db/dao/instrument';
import { Instrument } from '../entities/instrument';

export class InstrumentService {
  private instrument: InstrumentDAO;

  constructor() {
    this.instrument = new InstrumentDAO();
  }

  async searchInstruments(searchTerm?: string): Promise<Instrument[]> {
    return await this.instrument.searchByTerm(searchTerm);
  }
}