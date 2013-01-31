/* vim: set tabstop=4 shiftwidth=4: */
/*jslint mootools:true */
var app			 =   window.app || (window.app = {}),
	_			   =   window._,
	Picker		  =   window.Picker,
	PubSub		  =   window.PubSub;

/**
 * Handles user input
 * 
 * -----------------------------------------------------------------------------
 * Layout
 * -----------------------------------------------------------------------------
 * Controller
 */
(function () {
	'use strict';
	
	// Input field elements
	var Controller  =   {},
		inputFields =   $$('.app-input-flds'),
		dateFields  =   $$('.app-input-flds-date');
	
	// Handle user input from Input box
	Controller.Input = {};
	// Initialize input controls
	Controller.Input.init = (function () {
		_.bindAll(this, 'getInput', 'getSites', 'loadSites');
		
		dateFields.each(function (el) {
			var datePicker = new Picker.Date(el,
				app.settings.DP_SETTINGS);
			el.store('_picker', datePicker);
		});
		
		// Set DatePicker initial values
		$('sDate').retrieve('_picker').select(app.settings.FIRST_EVENT);
		$('eDate').retrieve('_picker').select(new Date());
	    $('itemsPerPage').value=25;	
		this.getSites();
		
		inputFields.addEvent('change', this.getInput);
	});
	// Prepare user input for data request
	Controller.Input.getInput = (function () {
		this._input = {};
		
		for (var idx = 0, l = inputFields.length; idx < l; idx++) {
			this._input[inputFields[idx].get('id')] = inputFields[idx].value;
		}
		
		this._input.page = this._input.maxPages = 0;
		
		PubSub.publish('inputChanged', this._input);
	});
	// Send request for Station data. Calls Controller.Input.loadSites when
	//   data is received
	Controller.Input.getSites = (function () {
		new Request({
			async: false,
			onSuccess: this.loadSites,
			url: Drupal.settings.drupal_path + '/sites.php'
		}).get();
	});
	// Retrieve Station data from sites.xml
	Controller.Input.loadSites = (function (txt, xml) {
		function addOption(node, level, parent) {
			var nbsp	=   '\u00a0', // Unicode &nbsp; character
				thisEl;
			if (node.tagName === 'category') {
				thisEl = new Element('optgroup', {
					label: node.getAttribute('name'),
					id: node.getAttribute('id')
				});
			//} else if (node.tagName === 'none') {
            } else {
                var typ = (node.tagName === 'none') ? 'site-gray' : '';
				thisEl = new Element('option', {
					id: node.getAttribute('id'),
                    class: typ,
					lat: node.getAttribute('lat'),
					lon: node.getAttribute('lon'),
					site: node.getAttribute('name'),

					// Create site hierarchical structure
					text: (new Array(level + 1).join(nbsp + nbsp)) +
						node.getAttribute('name') +
							' (' + node.getAttribute('descrip') + ')',
					value: node.getAttribute('id')
				});
			}
			parent.adopt(thisEl);
			if (node.hasChildNodes()) {
				for (var i = 0, j = node.childNodes, k = j.length; i < k; i++) {
					addOption(j[i], level + 1, (node.tagName === 'category') ?
						thisEl : parent);
				}
			}
		}
		
		for (var i = 0, j = xml.getElementsByTagName('category'), k = j.length;
				i < k; i++) {
			addOption(j[i], 0, $('site'));
		}
	});
	
	// Event query table navigation
	Controller.TableNav = {
		_currPage: 0,
		_maxPage: 0
	};
	// Initialize Table Navigation controls
	Controller.TableNav.init = (function () {
		_.bindAll(Controller.TableNav);
		$('table-ctrls').addEvent('click:relay(div.btn)',
			Controller.TableNav.navOnClick);
		$('table-ctrl-page').addEvent('keypress',
			Controller.TableNav.pageEntered);
		
		PubSub.subscribe('inputChanged', function () {
			Controller.TableNav._currPage = 0;
		});
		PubSub.subscribe('eventsUpdated', function () {
			var metaData = app.Models.Events.getMeta();
			this._currPage = metaData.pageNum;
			this._maxPage = metaData.totalPages;
			
			this.checkBounds();
		}.bind(this));
		
		this.checkBounds();
	});
	// Disable buttons if max/min is reached
	Controller.TableNav.checkBounds = (function () {
		// Check lower bound
		if (this._currPage < 1) {
			$('table-ctrl-prev').addClass('disabled');
		} else if ($('table-ctrl-prev').hasClass('disabled')) {
			$('table-ctrl-prev').removeClass('disabled');
		}
		
		// Check upper bound
		if (this._currPage >= this._maxPage - 1) {
			$('table-ctrl-next').addClass('disabled');
		} else if ($('table-ctrl-next').hasClass('disabled')) {
			$('table-ctrl-next').removeClass('disabled');
		}
	});
	Controller.TableNav.nav = (function (offset) {
	PubSub.publish('clearTable', {});
		this._currPage += parseInt(offset, 10);
		
		app.Controller.Input._input.page = this._currPage;
		app.Models.Events.fetch(app.Controller.Input._input);
	});
	Controller.TableNav.navOnClick = (function (evt, btn) {
		this.nav(btn.get('data-page-offset'));
		evt.preventDefault();
	});
	Controller.TableNav.pageEntered = (function (evt) {
		if (evt.key === 'enter') {
			this._currPage = $('table-ctrl-page').value - 1;
			app.Controller.Input._input.page = this._currPage;
			app.Models.Events.fetch(app.Controller.Input._input);
		}
	});
	
	app.Controller = Controller;

}) ();
