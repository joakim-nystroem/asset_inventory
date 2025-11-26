import type { Generated } from 'kysely';

export interface AssetInventoryTable {
  // 'Generated' means the DB handles it (auto_increment)
  id: Generated<number>; 
  bu_estate: string;
  department: string | null;
  location: string | null;
  node: string | null;
  asset_type: string;
  manufacturer: string;
  model: string;
  wbd_tag: string | null;
  serial_license: string;
}

export interface LocationsTable {
  id: Generated<number>;
  name: string;
}

export interface Database {
  asset_inventory: AssetInventoryTable;
  locations: LocationsTable;
}