export interface PropertyBadge {
  icon: string;
  color: string;
  symbol: string;
}

export interface PropertyPosition {
  x: number;
  y: number;
  z: number;
}

export type PropertyCategory =
  | 'purchasable_business'
  | 'mansion'
  | 'hangar'
  | 'bunker'
  | 'facility'
  | 'nightclub'
  | 'arcade'
  | 'auto_shop'
  | 'agency'
  | 'salvage_yard'
  | 'bail_office'
  | 'warehouse'
  | 'vehicle_warehouse'
  | 'ceo_office'
  | 'mc_business'
  | 'coke_lockup'
  | 'weed_farm'
  | 'meth_lab'
  | 'cash_factory'
  | 'doc_forgery'
  | 'mc_clubhouse'
  | 'ls_customs'
  | 'bennys'
  | 'hao_garage'
  | 'ls_car_meet'
  | 'animal'
  | 'service'
  | 'convenience_store'
  | 'car_wash'
  | 'strip_club'
  | 'roleplay_job';

export interface PropertyLocation {
  id: string;
  name: string;
  category: PropertyCategory;
  categoryLabel: string;
  gameMode: 'story' | 'online' | 'both';
  owner?: string;
  price: number;
  priceFormatted: string;
  imageUrl?: string;
  zone: string;
  description: string;
  features?: string[];
  income?: string;
  position: PropertyPosition;
  badge: PropertyBadge;
}
