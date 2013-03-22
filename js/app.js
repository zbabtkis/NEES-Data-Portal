/* vim: set tabstop=4 shiftwidth=4: */
/*jshint mootools:true */
var app			=	window.app || (window.app = {});

(function () {
	'use strict';

	app.DEBUG	=	false;
	app.Drupal  =   true;
	app.version	=	'0.2.3';

	window.addEvent('load', function () {
		app.Controller.Input.init();
		app.Controller.Input.getInput();
		app.Controller.TableNav.init();

		$('formatDetails').set('href', app.settings.FORMAT_DETAILS_URL);
		$('formatDetails').set('target', '_blank');
	});
	
}) ();
