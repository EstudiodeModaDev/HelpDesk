export type Categoria = {
    ID: string;
    Title: string; //Categoria
};

export type Subcategoria = {
    ID: string;
    Title: string; //subategoria
    Id_categoria: string
};

export type Articulo = {
    ID: string;
    Title: string; //subategoria
    Id_subCategoria: string
};
