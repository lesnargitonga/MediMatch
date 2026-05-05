export interface Listing {
  id: number;
  title: string;
  description?: string;
  quantity?: number;
  category?: string;
  location_wkt?: string;
  created_at?: string;
}
