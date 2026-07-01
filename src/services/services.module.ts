import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../repositories/repositories.module';
import { UrlShortenerService } from './UrlShortenerService/url-shortener.service';

/**
 * Services layer module. Imports the repositories (to inject the ports) and exports
 * the services so the controllers layer can use them. To add a service, register +
 * export it here.
 */
@Module({
  imports: [RepositoriesModule],
  providers: [UrlShortenerService],
  exports: [UrlShortenerService],
})
export class ServicesModule {}
