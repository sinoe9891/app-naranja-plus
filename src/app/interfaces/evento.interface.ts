export interface Evento {
  id: string;

  // Nuevo esquema
  name?: string;
  description?: string;
  status?: 'active' | 'inactive' | string;
  eventDate?: string;        // ISO string
  expirationDate?: string;   // ISO string

  images?: {
    frontImage?: string;
    sideImage?: string;
    sliderImage?: string;
    thumbnailImage?: string;
    ticketBodyImage?: string;
    ticketStubImage?: string;
    [key: string]: any;
  };

  zones?: Array<{
    name?: string;
    order?: number;
    price?: string | number;
    capacity?: number;
    type?: string;
    color?: string;
    discountLabel?: string;
    discountPercent?: number;
    [key: string]: any;
  }>;

  // Compatibilidad con esquema viejo (por si queda alguna pantalla)
  nombreevento?: string;
  fechaevento?: string | number;
  fechaeventofin?: number | string;
  portada?: string;

  [key: string]: any;
}
