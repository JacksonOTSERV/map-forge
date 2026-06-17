export interface TooltipTypes {
  actionId: boolean;
  uniqueId: boolean;
  doorId: boolean;
  destination: boolean;
  description: boolean;
  text: boolean;
}

export type TooltipTypeKey = keyof TooltipTypes;

export const DEFAULT_TOOLTIP_TYPES: TooltipTypes = {
  actionId: true,
  uniqueId: true,
  doorId: false,
  destination: true,
  description: true,
  text: true
};

export const TOOLTIP_TYPE_LABELS: { key: TooltipTypeKey; label: string }[] = [
  { key: 'actionId', label: 'Action ID' },
  { key: 'uniqueId', label: 'Unique ID' },
  { key: 'doorId', label: 'Door ID' },
  { key: 'destination', label: 'Destination' },
  { key: 'description', label: 'Description' },
  { key: 'text', label: 'Text' }
];
