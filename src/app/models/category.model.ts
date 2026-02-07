export interface Category {
  id: number;
  title: string;
  description?: string; // Optinal as per requirement "about (optional)"
  imagePath: string;
}

export interface DtoAddEditCategory {
  id?: number;
  title: string;
  description?: string;
  image?: File;
}
