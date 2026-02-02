export interface TeamMember {
  id: number;
  name: string;
  specialty: string;
  imageUrl: string | null;
  about: string;
  expertise: string[];
  contact: {
    instagram?: string;
    whatsapp?: string;
    facebook?: string;
  };
}
