import axios from 'axios';

const axiosLogger = axios.create();

axiosLogger.interceptors.request.use((config) => {
  console.log(`[SALIDA] ${config.method?.toUpperCase()} => ${config.url}`);
  return config;
});

axiosLogger.interceptors.response.use(
  (response) => {
    const size = JSON.stringify(response.data).length;
    console.log(`[RESPUESTA] ${response.config.url} - ${size} bytes`);
    return response;
  },
  (error) => {
    console.error(`[ERROR SALIDA] ${error.config?.url}`);
    return Promise.reject(error);
  }
);

export default axiosLogger;
