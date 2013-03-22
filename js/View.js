/* vim: set tabstop=4 shiftwidth=4: */
/*jslint mootools:true */
var	app			=	window.app || (window.app = {}),

	_			=	window._,
	google		=	window.google,
	PopUpWindow	=	window.PopUpWindow,
	PubSub		=	window.PubSub,
	Tabs		=	window.Tabs;

(function () {
	'use strict';
	
	var	cart,
		channelBox,
		info,
		help,
		map,
		tabs,
		evtGrid,
		thumbPop,
		View;
	
	app.View = {};
	
	tabs = new Tabs($('app-viewport'));
	
	View = new Class({
		initialize: function (options) {
			Object.append(this, options);
			_.bindAll(this);
			
			if (this._events) {
				Object.each(this._events, function (v, k) {
					PubSub.subscribe(k, this[v]);
				}, this);
			}
			
			this.setup();
		},
		render: function () {},
		setup: function () {}
	});
	
	map = new View({
		_events: {
			'inputChanged': 'setPosition',
			'eventsUpdated': '_drawMarkers'
		},
		_drawCircle: function (center, radius) {
			this._mapCirc.setMap(null);
			this._mapCirc.setCenter(center);
			this._mapCirc.setRadius(radius * 1000);
			this._mapCirc.setMap(this._mapObj);
		},
		_drawMarkers: function (data) {
			this._resetMarkers();

			for (var i = 0, j = data.length; i < j; i++) {
				var loc		=	new google.maps.LatLng(data[i].lat,
									data[i].lng),
					marker	=	new google.maps.Marker({
						flat: true,
						icon: Object.append({
							path: google.maps.SymbolPath.CIRCLE,
							fillColor: 'yellow',
							fillOpacity: 0.6,
							strokeColor: 'black',
							strokeOpacity: 1,
							strokeWeight: 1
						}, app.settings.getMarkerOptions(data[i].ml)),
						markerIndex: i.valueOf(),
						position: loc,
						title: 'Evid: ' + data[i].evid + '\nML: ' + data[i].ml,
						zIndex: -1
					});

				google.maps.event.addListener(marker, 'click', function () {
					$('app-evt-table').getElement('tbody tr[modelNum='
						+ this.markerIndex + ']').click();
				});
				
				marker.setMap(this._mapObj);
				this._markers.push(marker);
			}
		},
		_highlightMarker: function (index) {
			var marker	  =   this._markers[index],
				markerIcon  =   marker.getIcon();
				
			markerIcon.fillColor = 'red';
			marker.setIcon(markerIcon);
			marker.setZIndex(2);
		},
		_dehighlightMarker: function (index) {
			var marker	  =   this._markers[index],
				markerIcon  =   marker.getIcon();
				
			markerIcon.fillColor = 'yellow';
			marker.setIcon(markerIcon);
			marker.setZIndex(1);
		},
		_resetMarkers: function () {
			for (var i = this._markers.length - 1; i >= 0; i--) {
				this._markers[i].setMap(null);
				this._markers.pop();
			}
		},
		setPosition: function (data) {
			var center = new google.maps.LatLng($(data.site).get('lat'),
				$(data.site).get('lon'));

			if (this._mapCirc.getCenter() &&
				this._mapCirc.getCenter().equals(center) &&
				this._mapCirc.getRadius() === data.radius * 1000) {
				return;
			}

			this._mapObj.setOptions({
				center:	center
			});

			this._drawCircle(center, data.radius);
			this._mapObj.fitBounds(this._mapCirc.getBounds());
		},
		setup: function () {
			this._markers = [];
			this._el = tabs.add('MAP');
			this._mapObj = new google.maps.Map(this._el, {
				center: new google.maps.LatLng(0, 0),
				mapTypeId: google.maps.MapTypeId.TERRAIN,
				zoom: 8
			});
			this._mapCirc = new google.maps.Circle(
				app.settings.MAP_CIRCLE_SETTINGS);
			this._mapCirc.setMap(this._mapObj);
			
			this._el.addEvent('tabFocus',
				google.maps.event.trigger.pass([this._mapObj, 'resize']));
		}
	});
	
	info = new View({
		_loadInfo: function (text) {
			this._el.set('html', text);
		},
		setup: function () {
			this._el = tabs.add('SITE');
			
			PubSub.subscribe('inputChanged', function (data) {
				var shortName = $('site').options[$('site').selectedIndex]
					.getAttribute('site').toLowerCase();

				info._el.set('text', 'Loading...');

				new Request({
					onSuccess: info._loadInfo,
					url: (app.Drupal ? Drupal.settings.drupal_path + '/' : '') + '/siteInfo.php'
				}).get('site=' + shortName);
			});
			
			this._el.set('text', '');
		}
	});

	help = new View({
		_load: function (text) {
			this._el.set('html', text);
		},
		setup: function () {
			this._el = tabs.add('HELP');
			this._el.set('text', 'Loading...');
			
			new Request({
				onSuccess: this._load,
				url: app.settings.HELP_URL
			}).get('');
		}
	});
	
	evtGrid = new View({
		_events: {
			'eventsUpdated': '_loadEvents',
			'inputChanged': '_empty',
			'clearTable': '_empty'
		},
		_loadEvents: function (models) {
			var i, j, k,
				metaData;
				
			this._grid.empty();
			if (!app.Controller.Input._input.sortBy) {
				$$('.sort').removeClass('sort');
			}
			
			for (i = 0, j = models.length; i < j; i++) {
				this._grid.push(
					this.filter(Object.values(
						Object.subset(models[i], this._headers)
					)).append([
					new Element('div', {
						'class': 'evt-item evt-item-' + models[i].id,
						'title': 'You have selected channel(s) from this event'
				})]), {
					id: models[i].id,
					modelNum: i
				});
			}

			// Re-mark evt items on load
			for (i = 0, j = Object.keys(app.Models.Cart.toObj()),
					k = j.length; i < k; i++) {
				$$('.evt-item-' + j[i]).addClass('active');
			}
			
			metaData = app.Models.Events.getMeta();
			$('query-result').set('text', metaData.rows +
				' results.');
			$('table-ctrl-page').set('value', metaData.pageNum + 1);
			$('table-ctrl-total').set('text', metaData.totalPages);
		},
		_empty: function () {
			this._grid.empty();
			this._grid.push([ 'Loading...' ]);
		},
		_onSort: function (tbody, sortIndex) {
			var	colName,
				input   =   app.Controller.Input._input;
				
			if (sortIndex.get('text') === 'Evid') {
				colName = 'evid';
			} else {
				colName = Object.keyOf(app.settings.EVT_GRID_HEADER,
							sortIndex.get('html'));
			}
				
			this._grid.head.getElements('th').removeClass('sort')
				.removeClass('desc');
				
			if (input.sortBy && input.sortBy != colName || !input.desc) {
				input.sortBy = colName;
				sortIndex.addClass('sort');
				sortIndex.addClass('desc');
				input.desc = true;
			} else {
				input.sortBy = colName;
				sortIndex.addClass('sort');
				if (input.desc) delete input.desc;
			}
			input.page = 0;

			this._empty();
			
			app.Models.Events.fetch(input);
		},
		_rowOver: function (evt, row) {
			map._highlightMarker(parseInt(row.get('modelNum'), 10));
		},
		_rowOut: function (evt, row) {
			map._dehighlightMarker(parseInt(row.get('modelNum'), 10));
		},
		_rowSelected: function (evt, row) {
			var	date		=   app.Models.Events.get(row.get('id')).time,
				id			=   app.Models.Events.get(row.get('id')).id,
				
				evtObj		=   {
					evid: id,
					id: id,
					date: date,
					siteId: $(app.Controller.Input._input.site).get('id')
				};

			this.clearSelection();
			row.addClass('selected');
			
			channelBox.setCurrentEvent(evtObj);
			PubSub.publish('eventSelected', evtObj);
			
			thumbPop._pop.close();
		},
		_toggleDepEvid: function () {
			var	hasDepth	=	this._headers.contains('depth'),
				headerText	=	Object.values(app.settings.EVT_GRID_HEADER)
					.append(['']);
				
			this._headers = Object.keys(app.settings.EVT_GRID_HEADER)
				.append(['']);

			if (hasDepth) {
				headerText[headerText.indexOf('Depth (km)')] = 'Evid';
				this._headers[this._headers.indexOf('depth')] = 'evid';
			}
			this._grid.set('headers', headerText);
			
			this._loadEvents(app.Models.Events.toArray());
		},
		clearSelection: function () {
			this._el.getElements('tr').removeClass('selected');
		},
		filter: function (oldArr) {
			var newArr = [];
			for (var i = 0, j = oldArr.length; i < j; i++) {
				if (typeof oldArr[i] === 'string') {
					newArr[i] = oldArr[i].replace(' (UTC)', '');
				} else {
					newArr[i] = oldArr[i];
				}
			}
			return newArr;
		},
		setup: function () {
			_.bindAll(this);
			this._el = $('app-evt-table');
			
			this._headers = Object.keys(app.settings.EVT_GRID_HEADER);
			
			this._grid = new HtmlTable({
				classZebra: 'odd',
				gridContainer : this._el,
				headers: Object.values(app.settings.EVT_GRID_HEADER)
					.append(['']),
				zebra: true
			});
			this._grid.element.addEvent('click:relay(th)', this._onSort);
			this._grid.body.addEvent('click:relay(tr)', this._rowSelected);
			this._grid.body.addEvent('mouseover:relay(tr)', this._rowOver);
			this._grid.body.addEvent('mouseout:relay(tr)', this._rowOut);
			this._grid.inject(this._el);

			PubSub.subscribe('cartUpdated', function () {
				$$('.evt-item').removeClass('active');
				for (var i = 0, j = Object.keys(app.Models.Cart.toObj()),
					k = j.length; i < k; i++) {
					$$('.evt-item-' + j[i]).addClass('active');
				}
			});
			
			$('depToEvid').addEvent('click', this._toggleDepEvid);
		}
	});
	
	cart = new View({
		_events: {
			'cartUpdated': '_loadCart'
		},
		_emailRegex: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,6}$/i,
		_loadCart: function () {

			var	cartItems	=	app.Models.Cart.toObj(),
				pane		=	$('cart-left'),
				tree		=	new Element('ul');

			pane.empty();

			if (Object.getLength(cartItems) === 0) {
				pane.set('html', '<div>No channels selected!</div>');
			} else {
				for (var i = 0, j = Object.values(cartItems), l = j.length;
					i < l; i++) {
					var table = this._makeCartRow(j[i]);
					
					tree.adopt(new Element('li').adopt(table));
					pane.adopt(tree);
					table.body.lastChild.hide();
				}

			}
		},
		_makeCartRow: function (cartData) {
			var	chnList	=	new Element('ul'),
				evtChns	=	cartData.chnList;

			for (var p = 0, q = evtChns.length; p < q; p++) {
				chnList.adopt(new Element('li', {
					'text': evtChns[p]
				}));
			}


			var table = new HtmlTable({
				rows: [
					['<b>Event</b>:&nbsp;', 'ML ' + cartData.mag + ' @ '
						+ cartData.dist + 'km from ' + cartData.site],
					['<b>Evid</b>:&nbsp;', cartData.evid],
					['<b>Time</b>:&nbsp;', cartData.time],
					[{
						content: '<b>Channels</b>: ('
							+ evtChns.length + ')',
						properties: {
							class: 'expandChn',
							colspan: 2,
							events: {
								click: function (evt, tbl) {
									table.body.lastChild.toggle();
								}
							}
						}
					}],
					[{
						content: new Element('div').adopt(chnList)
							.get('html'),
						properties: {
							class: 'chnList',
							colspan: 2
						}
					}]
				]
			});

			return table;
		},
		_progress: function (response) {
			var obj = JSON.decode(response);
			
			if (cart.timeout > 1) {
				var percentDone = parseInt(obj.progress, 10);
				$('cart-download').setStyle('display', 'none');
				$('cart-progress').setStyle('display', 'block');
				$('cart-progress-bar').setStyle('width', percentDone + '%');
				
				if (percentDone !== 100 && percentDone >= 0) {
					setTimeout(cart._waitOn, 1000);
				} else {
					cart.zipAvail = true;
					
					$('cart-progress').setStyle('display', 'none');
					$('cart-download').setStyle('display', 'block');
					if (percentDone === -1) {
						$('cart-download').set('html', 'Server Timeout');
					} else {
						$('cart-download').set('html', '<a href="' + obj.file
							+ '">Click to download your data</a>');
					}
				}
			}
		},
		_waitOn: function () {
			new Request({
				async: true,
				method: 'post',
				onSuccess: function (response) {
					cart._progress(response);
				},
				url: (app.Drupal ? Drupal.settings.drupal_path + '/' : '') + '/readProgress.php'
			}).send('statusFile=' + cart.sfile);
		},
		_watchdog: function () {
			if (!cart.zipAvail) {
				if (cart.timeout > 1) {
					cart.timeout -= 1;
					setTimeout(cart._watchdog, 1000);
				} else {
					$('cart-progress').setStyle('display', 'none');
					$('cart-download').setStyle('display', 'block');
					$('cart-download').set('html', 'Server Timeout');
					cart.timeout = -1;
				}
			}
		},
		_confirmEmpty: function () {
			var	pos		=	$('view-cart').getCoordinates(),
				posY	=	pos.top - 15,
				posX	=	pos.left - 20;
			
			this._emptyPop.windowDiv.style.top = posY + 'px';
			this._emptyPop.windowDiv.style.left = posX + 'px';
			this._emptyPop.open();
		},
		_empty: function () {
			app.Models.Cart.empty();
			PubSub.publish('cartUpdated', app.Models.Cart._data);
			this._emptyPop.close();
		},
		_declineEmpty: function () {
			this._emptyPop.close();
		},
		_hide: function () {
			this._el.fade('out');
			this._overlay.fade('out');
		},
		_show: function () {
			this._el.fade('in');
			this._overlay.fade('in');
		},
		submit: function () {
			var	cartData, formatData, userData,
				name	=	$('cart-input-name').value,
				email   =   $('cart-input-email').value,
				formatCount, chnCount = 0;
			
			// Simple validation of email
			if (!this._emailRegex.test(email)) {
				alert('Please enter a valid e-mail address!');
				return;
			}
			
			cartData = {};
			
			userData			=	{};
			userData.name		=	name;
			userData.email		=	email;
			cartData.userData	=	userData;
			
			formatData			=	{};
			$$('#cart-input-format tbody tr').each(function (tableRow) {
				if (tableRow.getElement('.format-toggle').checked) {
					var f = tableRow.getElement('.format-toggle').name;
					formatData[f] =
						tableRow.getElement('.calib-calib').checked ?
							'v1' : 'v0';
					formatData[f] +=
						tableRow.getElement('.time-absolute').checked ?
							'' : 'T0';
				}
			});
			cartData.formatData	=	formatData;
			
			formatCount = Object.getLength(formatData);

			if (Object.getLength(formatData) === 0) {
				alert('Please select a format!');
				return;
			}
			
			cartData.evtData	=	{};
			for (var i = 0, j = app.Models.Cart.toObj(), k = Object.getLength(j); i < k; i++) {
				var evt = cartData.evtData[Object.keys(j)[i]] = {};
				evt.chnList = Object.values(j)[i].chnList;
			}
			
			for (var i = 0, j = Object.values(cartData.evtData), k = j.length;
				i < k; i++) {
				chnCount += j[i].chnList.length;
			}
			
			// Calculate worst-case timeout (give one second per channel per
			//   format)
			cart.initTimeout = (formatCount * chnCount * 5) + 15;
			cart.timeout = (formatCount * chnCount * 5) + 15;
			cart.zipAvail = false;
			
			if (!chnCount) {
				alert('No events/channels in the cart!');
				return;
			}
			
			new Request({
				method: 'post',
				onSuccess: function (response) {
					var obj = JSON.decode(response.split('%')[0]);
					cart.sfile = obj.progfile;
					cart._watchdog();
					cart._waitOn();
				},
				url: app.settings.CART_SUBMIT_URL
			}).send('json=' + JSON.encode(cartData));
		},
		setup: function () {
			var	appCart		=	this._el		=	$('app-cart'),
				cartOverlay	=	this._overlay	=	new Element('div', {
					'styles': {
						'background-color': 'rgba(0, 0, 0, 0.8)',
						'height': '100%',
						'left': 0,
						'position': 'fixed',
						'top': 0,
						'width': '100%',
						'z-index': 99
					}
				});
				
			// Set up format table
			for (var i = 0, j = app.settings.formats, k = Object.getLength(j);
					i < k; i++) {
				var enabled,
					formatName	=	Object.keys(j)[i],
					formatProps	=	Object.values(j)[i],
					tableRow	=	new Element('tr');
				
				enabled = formatProps.enabled;
				
				tableRow.adopt(
					new Element('td').adopt(
						new Element('input', {
							class: 'format-toggle',
							disabled: !enabled,
							name: formatProps.name,
							type: 'checkbox'
						})
					),
					new Element('td', {
						class: 'format-name' + (enabled ? '' : ' disabled'),
						text: formatName
					}),
					new Element('td').adopt(
						new Element('input', {
							class: 'calib-calib',
							disabled: !enabled || !formatProps.calibrate.calib,
							name: formatName + '-calib',
							type: 'radio'
						}),
						new Element('span', {
							class: !enabled || !formatProps.calibrate.calib
									? 'disabled': '',
							text: 'Calib'
						}),
						new Element('br'),
						new Element('input', {
							class: 'calib-counts',
							disabled: !enabled || !formatProps.calibrate.counts,
							name: formatName + '-calib',
							type: 'radio'
						}),
						new Element('span', {
							class: !enabled || !formatProps.calibrate.counts
									? 'disabled': '',
							text: 'Counts'
						})
					),
					new Element('td').adopt(
						new Element('input', {
							class: 'time-absolute',
							disabled: !enabled || !formatProps.time.absolute,
							name: formatName + '-time',
							type: 'radio'
						}),
						new Element('span', {
							class: !enabled || !formatProps.time.absolute
								? 'disabled': '',
							text: 'Absolute'
						}),
						new Element('br'),
						new Element('input', {
							class: 'time-relative',
							disabled: !enabled || !formatProps.time.relative,
							name: formatName + '-time',
							type: 'radio'
						}),
						new Element('span', {
							class: !enabled || !formatProps.time.relative
								? 'disabled': '',
							text: 'Relative'
						})
					)
				);
				
				$('cart-input-format').tBodies[0].adopt(tableRow);
			}
			
			$$('#cart-input-format td').each(function (tableCell) {
				var b = tableCell.getElements('input:enabled[type=radio]');
				if (b.length > 0) b[0].set('checked', true);
			});

			document.body.adopt(cartOverlay);
			$$(this._el, this._overlay).fade('hide');

			$('view-cart').addEvent('click', this._show);
				
			$('empty-cart').addEvent('click',
				this._confirmEmpty);
			$('yes-empty').addEvent('click', this._empty);
			$('no-empty').addEvent('click', this._declineEmpty);
			
			$('cart-close').addEvent('click', this._hide);
			cartOverlay.addEvent('click', this._hide);
			$('cart-submit').addEvent('click', this.submit);
			
			this._emptyPop = new PopUpWindow('-', {
				contentDiv: 'empty-box',
				height: '100px',
				width: '250px'
			});
			
			PubSub.subscribe('cartUpdated', function () {
				$('cart-progress').setStyle('display', 'none');
				$('cart-download').setStyle('display', 'none');
			});
		}
	});
	
	channelBox = new View({
		_events: {
			'cartUpdated': '_remarkChannels',
			'channelsUpdated':	'_loadChannels',
			'eventSelected':	'hide',
			'eventsUpdated':	'hide'
		},
		_loadChannels: function (models) {
			var	i, j, k,
				bodyRow,
				headRow;
			
			this._grid.empty();
			for (i = 0, j = models.length; i < j; i++) {
				var	cb,
					vchan	=	models[i].dfile,
					vddir	=	models[i].ddir,
					vtime	=	0;
					
				vtime = app.Models.Events.get(this.getCurrentEvent().id).epoch;
				cb = thumbPop.show(vddir, vchan, vtime);
				
				this._grid.push([
					new Element('div', {
						'class': 'cart-item',
						'title': 'Add/Remove from Cart'
					}),
				].append(Object.values(
					Object.subset(models[i], this._headers)
				)).append([
					new Element('div', {
						'class': 'wv-item',
						'events': {
							'mouseover': cb
						},
						'title': 'Select for viewing'
					})
				]), {
					'chan': models[i].chan
				});
			}
			
			if (models.length > 0) {
				// Synchronize table col width
				bodyRow = this._grid.body.getElement('tr').getElements('td');
				headRow = this._grid.head.getElements('th');
				for (i = 0, j = headRow.length - 1; i < j; i++) {
					headRow[i].setStyle('width', bodyRow[i].offsetWidth -
						parseInt(bodyRow[i].getStyle('padding'), 10) * 2 + 'px');
				}

				this._remarkChannels();

				// Set up clickable items
				$$('.wv-item, .cart-item:not(#chn-add-all)').addEvent('click', function () {
					this.toggleClass('active');
				});
				$$('.cart-item:not(#chn-add-all)').addEvent('click', this._addToCart);

				$$('.wv-item').addEvent('click', function () {
					if ($$('.wv-item.active').length > 4) {
						this.removeClass('active');
						alert('Can only view 4 items at a time.');
					}
				});
			} else {
				this._grid.push(['No channels availible']);
			}
			
			this._el.fade('in');
		},
		_adjustSize: function () {
			var	gridH,
				offsetH = $('app-grid').getSize().y - 5,
				sidebarW = $('app-grid').getSize().x + 10;
			this._el.setStyles({
				height: offsetH + 'px',
				left: sidebarW + 'px'
			});
			
			gridH = $('channel-title').getSize().y +
					$('channel-grid-head').getSize().y;
			this._bodyEl.setStyle('height', offsetH - gridH);
		},
		_addToCart: function () {
			var i, j, chnCount, siteEvt,
				active		=	$$('.cart-item.active:not(#chn-add-all) ! tr'),
				inactive	=	$$('.cart-item:not(.active):not(#chn-add-all) ! tr');
			
			for (i = 0, j = inactive.length; i < j; i++) {
				app.Models.Cart.remove(this.getCurrentEvent().evid,
					'' + inactive[i].get('chan'));
			}
			
			for (i = 0, j = active.length; i < j; i++) {
				var id	=   this.getCurrentEvent().id,
					evt	=   app.Models.Events.get(id);
				
				app.Models.Cart.add(this.getCurrentEvent().id,
				{
					dist: evt.dist,
					evid: evt.evid,
					mag: evt.ml,
					site: $('site').options[$('site').selectedIndex]
						.getAttribute('site'),
					sitevt: evt.id,
					time: evt.time
				}, '' + active[i].get('chan'));
			}
			
			for (i = 0, chnCount = 0,
				siteEvt = Object.keys(app.Models.Cart.toObj()),
				j = siteEvt.length; i < j; i++) {
				chnCount += app.Models.Cart.toObj()[siteEvt[i]].chnList.length;
			}
			
			if ($$('.cart-item:not(#chn-add-all):not(.active)').length === 0) {
				$('chn-add-all').addClass('active');
			} else {
				$('chn-add-all').removeClass('active');
			}
			PubSub.publish('cartUpdated', app.Models.Cart._data);
		},
		_remarkChannels: function () {
			// Re-mark channel cart items on load
			for (var i = 0, j = $$('#channel-grid-body tr'), k = j.length;
					i < k; i++) {
				if (app.Models.Cart.has(this.getCurrentEvent().evid,
						j[i].get('chan'))) {
					j[i].getElement('.cart-item').addClass('active');
				} else {
					j[i].getElement('.cart-item').removeClass('active');
				}
			}
			
			if ($$('.cart-item:not(#chn-add-all):not(.active)').length === 0) {
				$('chn-add-all').addClass('active');
			} else {
				$('chn-add-all').removeClass('active');
			}
		},
		_viewSelected: function () {
			var	i, j, evtTime, nsamp, srate,
				chanArr				=	[],
				staArr				=	[],
				selectedChannels	=	$$('.wv-item.active ! tr');

			if (selectedChannels.length === 0) {
				alert('No channels selected for viewing!');
				return;
			}

			$$('.wv-item.active ! tr').each(function (row) {
				var	staChan	=	row.get('chan').split(/_(.*)/),
					chnObj	=	app.Models.Channels.get(row.get('chan'));
					
				staChan = staChan[1].split(/_(.*)/);
				staArr.push(staChan[0]);
				chanArr.push(staChan[1]);

				// nsamp and srate appear not to vary per chn
				nsamp = chnObj.nsamp;
				srate = chnObj.srate;
			});

			var multiSta = false;
			for (i = 0, j = staArr.length - 1; i < j; i++) {
				if (staArr[i] != staArr[i + 1]) {
					multiSta = true;
					break;
				}
			}
			if (multiSta) {
				alert('Viewing channels with different STA\'s in the same ' +
					'viewer-instance currently not supported.');
				return;
			}
			
			evtTime = app.Models.Events.get(this.getCurrentEvent().id).epoch;

			var ans = true;
			if (Browser.ie) {
				ans = confirm('Waveform Viewer is currently not supported in Internet Explorer. Continue?');
			}

			// Open WF Viewer
			if (ans) {
				window.open(app.settings.constructWF(
					staArr[0],
					chanArr,
					evtTime,
					nsamp,
					srate
				));
			}
		},
		hide: function () {
			this._el.fade('out');
		},
		setup: function () {
			_.bindAll(this);
			this._el = $('app-channel-box');
			this._headEl = $('channel-grid-head');
			this._bodyEl = $('channel-grid-body');
			
			this._headers = Object.keys(app.settings.CHN_GRID_HEADER);
			
			this._grid = new HtmlTable({
				classZebra: 'odd',
				gridContainer : this._gridEl,
				headers: [
					new Element('div', {
						class: 'cart-item',
						id: 'chn-add-all',
						title: 'Add/Remove all channels'
					})
				]
				.append(Object.values(app.settings.CHN_GRID_HEADER))
				.append(['']),
				zebra: true
			});
			this._headEl.adopt(new Element('table').adopt(this._grid.thead));
			this._bodyEl.adopt(new Element('table').adopt(this._grid.body));
			
			window.addEvent('resize', this._adjustSize);
			this._adjustSize();
			
			this._el.fade('hide');
			
			$('channel-close').addEvent('click', this.hide);
			$('channel-view').addEvent('click', this._viewSelected);
			
			$('chn-add-all').addEvent('click', function () {
				if ($('chn-add-all').hasClass('active')) {
					// Remove all from cart
					$$('.cart-item').removeClass('active');
				} else {
					$$('.cart-item').addClass('active');
				}
				this._addToCart();
			}.bind(this));
		},
		getCurrentEvent: function () {
			return this._currEvt || {};
		},
		setCurrentEvent: function (currEvt) {
			this._currEvt = currEvt;
		}
	});
	
	thumbPop = new View({
		setup: function () {
			var	that	=	this;
			
			this._pop = new PopUpWindow('PopUp Window', {
				contentDiv: 'thumb-box',
				height: '100px',
				width: '250px'
			});
			
			this.enabled = !$('disablePrev').checked;
			
			$('disablePrev').addEvent('click', function () {
				if ($('disablePrev').checked) {
					that.enabled = false;
					that._pop.close();
				} else {
					that.enabled = true;
				}
			});
		},
		show: function (ddir, dfile, epoch) {
			var that = this;
			return function () {
				var	preview, text,
					winSize	=	window.getSize(),
					pos		=	that._pop.windowDiv.getCoordinates();
	
				if (ddir === -1 || pos.top > winSize.y - 20 ||
					pos.left > winSize.x - 20) {
					var posX, posY;
					pos		=	$('app-wrap').getCoordinates();
					posY	=	pos.top + 50;
					posX	=	pos.left + 70;
					
					that._pop.windowDiv.style.top	=	posY + 'px';
					that._pop.windowDiv.style.left	=	posX + 'px';
				}
				
				that._pop.windowDiv.getElement('span').innerHTML = dfile;
				
				preview	=	$('thumb-box');
				
				var thumbURL	=	app.settings.THUMBNAIL_URL_STRING
					.replace('{DDIR}', ddir)
					.replace('{DFILE}', dfile)
					.replace('{EPOCH}', epoch);
				
				text	=	'<img src="'+ thumbURL + '" width=250>'
					+ '<div>(Note: waveform filtered 0.5 to 40Hz)</div>';
				preview.set('html', text);
				
				that._pop[that.enabled ? 'open' : 'close']();
			};
		}
	});
	app.View.Preview = thumbPop;

}) ();
