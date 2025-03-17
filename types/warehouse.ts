export interface Warehouse {
  id: string
  location: string
  warehouse: string;
  created_at?: string
}

export interface WorkerLocation {
  id: string
  user_id: string
  warehouse_id: string
  warehouse?: Warehouse
  created_at?: string
  updated_at?: string
}

