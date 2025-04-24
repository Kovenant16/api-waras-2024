import mongoose from "mongoose";
import { initAuthCreds, BufferJSON } from "@whiskeysockets/baileys";

// Esquema y modelo para almacenar las credenciales y llaves
const AuthSchema = new mongoose.Schema({
  _id: String, // Puede ser 'creds' o 'type:id' como 'app-state-sync-key:abc123'
  data: mongoose.Schema.Types.Mixed,
});
const Auth = mongoose.models.Auth || mongoose.model("Auth", AuthSchema);

export const useMongoDBAuthState = async () => {
  // Cargar creds
  const credsDoc = await Auth.findById("creds");
  let creds;

  if (!credsDoc) {
    creds = initAuthCreds();
    await Auth.create({
      _id: "creds",
      data: BufferJSON.replacer("", creds),
    });
  } else {
    creds = BufferJSON.reviver("", credsDoc.data);
  }

  // Guardar creds
  const saveCreds = async () => {
    await Auth.findByIdAndUpdate(
      "creds",
      { data: BufferJSON.replacer("", creds) },
      { upsert: true }
    );
  };

  // Sistema de llaves (app-state-sync, etc.)
  const keys = {
    get: async (type, ids) => {
      const data = {};
      const docs = await Auth.find({
        _id: { $in: ids.map((id) => `${type}:${id}`) },
      });

      for (const doc of docs) {
        const id = doc._id.split(":")[1];
        data[id] = BufferJSON.reviver("", doc.data);
      }

      return data;
    },
    set: async (data) => {
      const tasks = Object.entries(data).map(async ([key, value]) => {
        const [type, id] = key.split(":");
        await Auth.findByIdAndUpdate(
          `${type}:${id}`,
          { data: BufferJSON.replacer("", value) },
          { upsert: true }
        );
      });
      await Promise.all(tasks);
    },
    delete: async (ids) => {
      await Auth.deleteMany({ _id: { $in: ids } });
    },
  };

  return {
    state: {
      creds,
      keys,
    },
    saveCreds,
  };
};
