import { crearServidor } from './infrastructure/http/servidor';
import { construirContenedor } from './config/contenedor';

const PUERTO = process.env.PORT ? Number(process.env.PORT) : 3001;

const contenedor = construirContenedor();
const app = crearServidor(contenedor);

app.listen(PUERTO, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PUERTO}`);
});
