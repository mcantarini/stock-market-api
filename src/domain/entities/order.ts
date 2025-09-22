export interface Order {
  id: number;
  instrumentid: number | null;
  userid: number | null;
  size: number | null;
  price: string | null;
  type: string | null;
  side: string | null;
  status: string | null;
  datetime: string | null;
}