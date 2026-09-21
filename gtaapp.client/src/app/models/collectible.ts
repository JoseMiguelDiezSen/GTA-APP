export interface CollectibleBadge {
  icon: string;
  color: string;
  symbol: string;
}

export interface CollectiblePosition {
  x: number;
  y: number;
  z: number;
}

export type CollectibleCategory =
  | 'playing_card'
  | 'action_figure'
  | 'signal_jammer'
  | 'movie_prop'
  | 'radio_antenna';

export interface CollectibleItem {
  id: string;
  name: string;
  category: CollectibleCategory;
  categoryLabel: string;
  number: number;
  total: number;
  zone: string;
  description: string;
  hint: string;
  reward: string;
  position: CollectiblePosition;
  badge: CollectibleBadge;
}
