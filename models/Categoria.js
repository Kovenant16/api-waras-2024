import mongoose from "mongoose";

const categoriaSchema = mongoose.Schema(
    {
        nombre:{type: String, required: true, trim: true},
        descripcion:{type: String, trim: true},
        cover:{type: String}
    }
);

const Categoria = mongoose.model("Categoria", categoriaSchema);
export default Categoria;