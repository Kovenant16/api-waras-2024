import mongoose from "mongoose";

const categoriaSchema = mongoose.Schema(
    {
        nombre:String,
        descripcion:String,
        cover:String
    }
);

const Categoria = mongoose.model("Categoria", categoriaSchema);
export default Categoria;