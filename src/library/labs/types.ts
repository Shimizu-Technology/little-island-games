export type DiscoveryLabId =
  | "color-light-lab"
  | "sound-rhythm-lab"
  | "volcano-island-lab"
  | "ramp-balance-lab"
  | "plant-growth-lab"
  | "heartbeat-breath-lab";

export interface DiscoveryLabMeta {
  id: DiscoveryLabId;
  destinationId: `dlab-${DiscoveryLabId}`;
  title: string;
  shortTitle: string;
  tagline: string;
  category: string;
  playCue: string;
  accentColor: string;
  tintColor: string;
  borderColor: string;
  searchAliases: string[];
  searchTags: string[];
}

export interface DiscoveryLabProps {
  sound: boolean;
}
