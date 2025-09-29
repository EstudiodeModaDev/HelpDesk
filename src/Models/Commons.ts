export type GetAllOpts = {
  filter?: string;    
  orderby?: string;   
  top?: number;        
};

export type PageResult<T> = {
  items: T[];
  nextLink: string | null;
};