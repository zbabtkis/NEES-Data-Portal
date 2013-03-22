/* vim: set tabstop=4 shiftwidth=4: */
/*jslint mootools:true */
var app	 =   window.app || (window.app = {});

/**
 * Specifies algorithms controlling how certain objects are displayed
 * 
 * -----------------------------------------------------------------------------
 * Layout
 * -----------------------------------------------------------------------------
 * app.settings
 * - DP_SETTINGS
 * - FIRST_EVENT
 * - MAP_CIRCLE_SETTINGS
 * 
 * - getMarkerOptions(ml)
 */
(function () {
	'use strict';
	
	var	// Constant primatives
		FIRST_EVENT_UTC		=	1072944000, // UTC time of first event
		WAVEFORM_BASE_URL	=	'http://nees.ucsb.edu:8889/wf/',
		// Initialize settings object
		settings			=   {};
		
	settings.FORMAT_DETAILS_URL	=	(app.Drupal ? Drupal.settings.drupal_path + '/' : '') + '/format.pdf';
	settings.HELP_URL			=	(app.Drupal ? Drupal.settings.drupal_path + '/' : '') + '/help.php';
	settings.CART_SUBMIT_URL	=	(app.Drupal ? Drupal.settings.drupal_path + '/' : '') + '/cartProc.php';
	settings.FACILITIES_URL		=	'http://eot-dev.nees.ucsb.edu/facilities/';
	
	settings.CART_COUNT_STRING	=	'{chnCount} chans in {evtCount} events';
	settings.THUMBNAIL_URL_STRING	=
		'thumbnail.php?ddir={DDIR}&file={DFILE}&time={EPOCH}';
	
	settings.formats		=	{
		'ASCII': {
			enabled: true,
			name: 'asc',
			
			calibrate: {
				counts: true,
				calib: true
			},
			time: {
				absolute: true,
				relative: true
			}
		},
		'COSMOS': {
			enabled: false,
			name: 'cos',
			
			calibrate: {
				counts: true,
				calib: true
			},
			time: {
				absolute: true,
				relative: false
			}
		},
		'MINISEED': {
			enabled: true,
			name: 'msd',
			
			calibrate: {
				counts: true,
				calib: false
			},
			time: {
				absolute: true,
				relative: false
			}
		},
		'RDV': {
			enabled: true,
			name: 'rdv',
			
			calibrate: {
				counts: true,
				calib: true
			},
			time: {
				absolute: true,
				relative: true
			}
		},
		'SAC': {
			enabled: true,
			name: 'sac',
			
			calibrate: {
				counts: true,
				calib: true
			},
			time: {
				absolute: true,
				relative: false
			}
		},
		'MATLAB-CSV': {
			enabled: true,
			name: 'mlb',
			
			calibrate: {
				counts: true,
				calib: true
			},
			time: {
				absolute: true,
				relative: false
			}
		}
	};
	
	// Constant objects
	settings.DP_SETTINGS	=   { // DatePicker opts
		format: '%x',
		pickerClass: 'datepicker_jqui',
		positionOffset: { x: -20, y: 5},
		yearPicker: true
	},
	settings.MAP_CIRCLE_SETTINGS	=   { // google.maps.Circle
		fillColor: 'black',
		fillOpacity: 0.25,
		strokeOpacity: 0.0
	};
	settings.CHN_GRID_HEADER = {
		chan: '<span title="We assign location codes, e.g. 00 or 99 to the channel names to identify the instrument and its location. The images in the Info tab show the relative position and depth. Survey maps are available for the site layouts.">Channel</span>',
		snr: '<span title="Ratio of peak value to pre-event RMS level">SNR</span>',
		peaka: '<span title="Abs value of filtered-signal\'s peak (0.5 to 40Hz)">Peak</span>'
	};
	settings.EVT_GRID_HEADER = {
		time: 'Date (UTC)',
		depth: 'Depth (km)',
		dist: 'Dist (km)',
		ml:	'Mag'
	};
		
	// Default value for sDate field
	settings.FIRST_EVENT = new Date(0);
	settings.FIRST_EVENT.setUTCSeconds(FIRST_EVENT_UTC);

	// Algorithm used to determine Map marker size based on event magnitude
	settings.getMarkerOptions = function (ml) {
		return {
			scale: 4 + 0.5 * Math.pow(ml, 2)
		};
	};
	settings.constructWF = function (site, stations, time, nsamp, srate) {
		time -= 15;
		
		var	endTime	=	time + 10 + (nsamp - 1) / srate,
			staStr	=	stations.join('|'),
			params	=	[site, staStr, time, endTime];

		return WAVEFORM_BASE_URL + params.join('/');
	};
	
	app.settings = settings;
	
}) ();
