import type { ManageService } from '#service';
import type { Handler } from 'express';

/**
 * Simple firewall error page
 * @param service
 */
export function firewallErrorPage(service: ManageService): Handler {
	return async (req, res) => {
		service.logger.warn('Firewall error page requested');
		return res.render('views/static/error/firewall-error.njk', {
			pageTitle: 'Firewall Error'
		});
	};
}
