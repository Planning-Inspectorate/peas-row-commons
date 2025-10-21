import { createApp } from './app/app.ts';
import { loadConfig } from './app/config.ts';
import { App2Service } from '#service';

const config = loadConfig();
const service = new App2Service(config);

const app = createApp(service);

// Trust proxy, because our application is behind Front Door
// required for secure session cookies
// see https://expressjs.com/en/resources/middleware/session.html#cookiesecure
app.set('trust proxy', true);

// set the HTTP port to use from loaded config
app.set('http-port', config.httpPort);

// start the app, listening for incoming requests on the given port
app.listen(app.get('http-port'), () => {
	service.logger.info(`Server is running at http://localhost:${app.get('http-port')} in ${app.get('env')} mode`);
});
