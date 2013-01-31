
var	app		=	window.app || (window.app = {}),

	_		=	window._,
	google	=	window.google,
	PubSub	=	window.PubSub,
	Tabs	=	window.Tabs;

(function () {
	'use strict';
	
	var	cart,
		channelBox,
		info,
		map,
		tabs,
		evtGrid,
		View,
      sfile, timeout, zipAvail;
	
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
						}, app.settings.getMarkerOptions(data[i].ml)),
						position: loc,
                        title: "Evid#" + data[i].evid + " ML:" + data[i].ml,
					});
				
	
				marker.setMap(this._mapObj);
				this._markers.push(marker);
			}
		},
		_highlightMarker: function (index) {
            var marker      =   this._markers[index],
                markerIcon  =   marker.getIcon();
                
            markerIcon.fillColor = 'red';
			marker.setIcon(markerIcon);
            marker.setZIndex(2);
		},
		_dehighlightMarker: function (index) {
            var marker      =   this._markers[index],
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

			this._el.addEvent('tabFocus', google.maps.event.trigger.pass([this._mapObj, 'resize']));
			
		}
	});
	
	info = new View({
		_loadInfo: function (text) {
			this._el.set('html', text);
		},
		setup: function () {
			this._el = tabs.add('INFO');
			this._el.setStyles({
				overflow: 'auto',
				padding: '25px 15px',
				color: '#333',
				width: '95%'
			});

			PubSub.subscribe('inputChanged', function () {
				var shortName = $('site').options[$('site').selectedIndex].getAttribute('site')
					.toLowerCase();

				info._el.set('text', 'Loading...');

				new Request({
					onSuccess: info._loadInfo,
					url: Drupal.settings.drupal_path + '/siteInfo.php'
				}).get('site=' + shortName);
			});
		}
	});
	
	evtGrid = new View({
		_events: {
			'eventsUpdated': '_loadEvents',
			'clearTable': '_empty'
		},
		_loadEvents: function (models) {
			var i, j, k, metaData;
			channelBox.hide();
			this._grid.empty();
			if (!app.Controller.Input._input.sortBy) {
				$$('.sort').removeClass('sort');
			}
			for (i = 0, j = models.length; i < j; i++) {
				this._grid.push( 
				   this.filter(Object.values(
				      Object.subset(models[i], this._headers))).append(
				   [new Element('div', {
				      'class': 'evt-item evt-item-' + models[i].id,
				   'title':'You have selected channel(s) from this event' })]) , { modelNum: i });
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
			hidePrev();
		},
		_onSort: function (tbody, sortIndex) {
			var input   =   app.Controller.Input._input,
				colName =   Object.keyOf(app.settings.EVT_GRID_HEADER,
								sortIndex.get('html'));
				
			this._grid.head.getElements('th').removeClass('sort').removeClass('desc');
			
			input.sortBy = colName;
			if (input.sortBy && !input.desc) {
				sortIndex.addClass('sort');
				sortIndex.addClass('desc');
				input.desc = true;
			} else {
				sortIndex.addClass('sort');
				if (input.desc) delete input.desc;
			}
			input.page = 0;

			app.Models.Events.fetch(input);
			
		},
		_rowOver: function (evt, row) {
			map._highlightMarker(parseInt(row.get('modelNum'), 10));
		},
		_rowOut: function (evt, row) {
			map._dehighlightMarker(parseInt(row.get('modelNum'), 10));
		},
		_rowSelected: function (evt, row) {
			var modelNum	=   parseInt(row.get('modelNum'), 10),
				date		=   app.Models.Events.toArray()[modelNum].time,
				evid		=   app.Models.Events.toArray()[modelNum].id,
				
				evtObj		=   {
					evid: evid,
					date: date,
					siteId: $(app.Controller.Input._input.site).get('id')
				};

			this.clearSelection();
			row.addClass('selected');
			
			channelBox.setCurrentEvent(evtObj);
			PubSub.publish('eventSelected', evtObj);
         hidePrev()
		},
		_toggleDepEvid: function () {
			var	hasDepth	=	this._headers.contains('depth'),
				headerText	=	Object.values(app.settings.EVT_GRID_HEADER).append(['']);
			this._headers = Object.keys(app.settings.EVT_GRID_HEADER).append([''])

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
				headers: (Object.values(app.settings.EVT_GRID_HEADER)).append(['']),
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
			var cartItems	=	app.Models.Cart.toObj(),
				 pane		=	$('cart-left'),
				 tree		=	new Element('ul');

			pane.empty();

			if (Object.getLength(cartItems) === 0) {
            pane.set('html', '<div>No channels selected!</div>');
         } else {
            for (var i = 0, j = Object.values(cartItems), l = j.length; i < l; i++) {   
               var	chnList	=	new Element('ul', {class: 'cart-chn-lst'}), evtChns = j[i].chnList;
               for (var p = 0, q = evtChns.length; p < q; p++) {
                  chnList.adopt(new Element('li', {'text': evtChns[p]}));
               } 
               tree.adopt((new Element('li', {
                            'html': '<b>Event</b>: ' + 'ML ' + j[i].mag + ' @ ' + j[i].dist + 'km from ' + j[i].site +
                            '<br /><b>Evid:</b> ' + j[i].evid +
                            '<br /><b>Time</b>: ' + j[i].time +
                            '<br /><b>Channels</b>: x' + p
                        })).adopt(chnList));
               pane.adopt(tree);
            }
         }
	},

	setup: function () {
			var appCart = this._el = $('app-cart');

			this._el.fade('hide');
			//$('subButton').addEvent('click', this.checkout);
			$('subButton').addEvent('click', this.submit);
			$('view-cart').addEvent('click', appCart.fade.pass('in', appCart));
			$('empty-cart').addEvent('click', this.preempty);
			$('yes-empty').addEvent('click', this.empty);
			$('no-empty').addEvent('click', this.noempty);
			$('cart-close').addEvent('click', appCart.fade.pass('out', appCart));
		},

		
        progress: function (responseText ) {
           var obj = JSON.parse(responseText);
           $('cart-progress').style.width=(obj.progress * 2) + 'px' ; 
           var myf = cart.waitOn;
           if (cart.timeout >1) {
              var percentDone = parseInt(obj.progress);
              if ((percentDone != 100) && (percentDone >= 0)) { setTimeout(myf, 1000); }
              else if (percentDone == -1) {
                 cart.zipAvail = 1;
                 $('cart-dwnld').innerHTML="Server Error";
              }
              else {
                 cart.zipAvail = 1;
                 var ml = "<a href='" + (obj.file) + "'>Click to download your data</a>";
                 $('cart-dwnld').innerHTML=ml;
                 //$('subButton').addEvent('click', this.submit);
              }
           }
        },
        
        watchdog: function() {
           if (cart.zipAvail != 1) {
              if (cart.timeout > 1) {
                 cart.timeout -= 1;
                 $('cart-dwnld').innerHTML="Estimated max time left: " + cart.timeout + "seconds";
                 setTimeout(cart.watchdog, 1000);
              }
              else {
                 $('cart-dwnld').innerHTML="Server Timeout";
                 cart.timeout = -1;
              }
           }
         },

        waitOn: function () {
               var q = new Request({ async: true, url: Drupal.settings.drupal_path + '/readProgress.php', method: 'get',
                                     onSuccess: function(responseText) { cart.progress(responseText); },
                                   });
               q.send("statusFile=" + cart.sfile);
       },
        
       preempty: function() {
         var pos =  $('view-cart').getCoordinates();
         var posY = pos.top  -15;
         var posX = pos.left -45;
         emptyPopUp.windowDiv.style.top = posY + "px";
         emptyPopUp.windowDiv.style.left = posX + "px";
         emptyPopUp.open();     
       },
       noempty: function() {
             emptyPopUp.close();
       },
       empty: function() {
             app.Models.Cart.empty();
             $('in-cart').innerHTML = "(Cart empty)";
             $$('.cart-item').removeClass('active');
             PubSub.publish('cartUpdated', app.Models.Cart._data);
             emptyPopUp.close();
       },

        submit: function () {
            var	cartData, formatData, userData,
				name	=	$('cart-input-name').value,
            email =   $('cart-input-email').value,
            frmtCnt, chnCnt=0;
           this.test = 0;
           
            // Simple validation of email
            if (!this._emailRegex.test(email)) {
                alert('Please enter a valid e-mail address!');
                return;
            }
            
            cartData = {};
            
            userData          = {};
            userData.name     = name;
            userData.email    = email;
            cartData.userData = userData;
            
            formatData			=	{};
            $$('#cart-input-format tbody tr').each(function (tableRow) {
               if (tableRow.getElement('.format-toggle').checked) {
                  var formatName = tableRow.getElement('.format-toggle').name;
                  formatData[formatName]  = tableRow.getElement('.calib-calib').checked   ? 'v1' : 'v0';
                  formatData[formatName] += tableRow.getElement('.time-absolute').checked ? ''   : 'T0';
               }
            });
            cartData.formatData	=	formatData;
            frmtCnt = Object.getLength(formatData);
			   if (frmtCnt == 0) {
				   alert('Please select a format!');
				   return;
 		      }
            
            var eventLst = {}; 
            for(var i=0, siteEvt = Object.keys(app.Models.Cart.toObj()); i < siteEvt.length; i++) {
               eventLst[siteEvt[i]] = {};
               eventLst[siteEvt[i]]['chnList'] = app.Models.Cart.toObj()[siteEvt[i]]['chnList'];
               chnCnt += eventLst[siteEvt[i]]['chnList'].length;
            }
            cartData.evtData	=	eventLst;
            console.log(JSON.encode(cartData));
            
            // Use frmtCnt and chnCnt to calc a worst-case timeout
            // At end of this timeout... abort operation
            // While processing in-progress... grey-out/disable submit button
            //alert((frmtCnt * chnCnt));
            // for now... one second per channel per format!
            cart.timeout  = (frmtCnt * chnCnt * 5) + 15;
            cart.zipAvail = 0;
        
            if (chnCnt == 0) { 
               alert("No events/channels in the cart!");
               return;
            }
    
            new Request({
             method: 'post',
				 url: app.settings.CART_SUBMIT_URL,
             onSuccess: function(responseText){ var obj = JSON.parse(responseText.split('%')[0]); 
                                                cart.sfile = obj.progfile; 
                                                //$('subButton').removeEvent('click', this.submit);
                                                cart.watchdog();
                                                cart.waitOn(); }
            }).send('json=' + JSON.encode(cartData));
        }
	});
	
	channelBox = new View({
		_events: {
			'channelsUpdated': '_loadChannels',
			'eventsUpdated': 'hide'
		},
		_loadChannels: function (models) {
			var	i, j,	bodyRow,	headRow;

			this._grid.empty();
			for (i = 0, j = models.length; i < j; i++) {
             var vchan=models[i].dfile
             var vddir=models[i].ddir
             var vtime=0
			    for (var x = 0, y = app.Models.Events.toArray(), k = y.length; x < k; x++) {
				    if (y[x].id === this.getCurrentEvent().evid) { vtime = y[x].epoch; }
             }
             var thb = "thumb('" + vddir + "','" + vchan +"'," + vtime + ")";
				 this._grid.push([$$( new Element('div', { 'class': 'cart-item' }))].append( 
				                 Object.values( Object.subset(models[i], this._headers))).append(
				                 $$(Element('div', { 'class': 'wv-item' , 'onmouseover': thb  } )) ),
                             { 'chan': models[i].chan,
					                'chnId': models[i].id,
					                'modelNum': i,
					                'nsamp': models[i].nsamp,
				                   'srate': models[i].srate });
			}
			if (models.length > 0) {
				// Synchronize table col width
				bodyRow = this._grid.body.getElement('tr').getElements('td');
				headRow = this._grid.head.getElements('th');
				for (i = 0, j = headRow.length - 1; i < j; i++) {
					headRow[i].setStyle('width', bodyRow[i].offsetWidth -
						parseInt(bodyRow[i].getStyle('padding'), 10) * 2 + 'px');
				}

				// Re-mark channel cart items on load
				for (i = 0, j = $$('#channel-grid-body tr'), k = j.length;
						i < k; i++) {
					if (app.Models.Cart.has(this.getCurrentEvent().evid,
							j[i].get('chan'))) {
						j[i].getElement('.cart-item').addClass('active');
					}
				}

                if ($$('.cart-item:not(#chn-add-all):not(.active)').length === 0) {
                    $('chn-add-all').addClass('active');
                } else {
                    $('chn-add-all').removeClass('active');
                }

				// Set up clickable items
				$$('.cart-item:not(#chn-add-all)').addEvent('click', function () {
					this.toggleClass('active');
                });
				$$('.cart-item:not(#chn-add-all)').addEvent('click', this._addToCart);
				$$('.wv-item').addEvent('click', function () {
					this.toggleClass('active');
					if ($$('.wv-item.active').length > 8) {
						this.removeClass('active');
						alert('Can only view 8 items at a time.');
					}
				});
			} else {
				this._grid.push(['No channels availible']);
			}
			//this._slideObj.slideIn();
		    this._el.fade('in');

		},
		_adjustSize: function () {
			var titleH = $('app-title').getSize().y,
				gridH,
				offsetH = window.getSize().y - titleH - 50,
				sidebarW = $('app-grid').getCoordinates().left + $('app-grid').getSize().x + 70;
			this._el.setStyles({	height: offsetH + 'px',
				                  left: sidebarW + 'px' });
			
			gridH = $('channel-title').getSize().y +
					  $('channel-controls').getSize().y +
					  $('channel-grid-head').getSize().y;
			this._bodyEl.setStyle('height', offsetH - gridH);
		},

		_addToCart: function () {
			var i, j,
                active		=	$$('.cart-item.active:not(#chn-add-all) ! tr'),
				inactive	=	$$('.cart-item:not(.active):not(#chn-add-all) ! tr');
			
			for (i = 0, j = inactive.length; i < j; i++) {
				app.Models.Cart.remove(this.getCurrentEvent().evid,
					'' + inactive[i].get('chan'));
			}
            
			for (i = 0, j = active.length; i < j; i++) {
                var evid    =   this.getCurrentEvent().evid,
                    evt     =   app.Models.Events.get(evid);
                
                var siteName = $('site').options[$('site').selectedIndex].getAttribute('site');
                

		app.Models.Cart.add(this.getCurrentEvent().evid,
			{
                        time:   evt.time,
                        sitevt: evt.id,
                        evid:   evt.evid,
                        site:   siteName,
                        dist:   evt.dist,
                        mag:    evt.ml
			}, '' + active[i].get('chan'));
			}

    for(var i=0, chnCnt = 0, siteEvt = Object.keys(app.Models.Cart.toObj()); i < siteEvt.length; i++) {
       chnCnt += app.Models.Cart.toObj()[siteEvt[i]]['chnList'].length;
    }
    // Here's where we can put a chcek on max-allowable cart events... 
    if ((i + chnCnt) == 0) {
       $('in-cart').innerHTML = "(Cart empty)";
    }
    else {
       $('in-cart').innerHTML = "(" + chnCnt + " Chans from " + i + " Events)";
    }
            

            if ($$('.cart-item:not(#chn-add-all):not(.active)').length === 0) {
                $('chn-add-all').addClass('active');
            } else {
                $('chn-add-all').removeClass('active');
            }
			PubSub.publish('cartUpdated', app.Models.Cart._data);
		},
		_viewSelected: function () {
			var	evtTime, nsamp, srate,
				staArr				=	[],
				chanArr				=	[],
				selectedChannels	=	$$('.wv-item.active ! tr');

			if (selectedChannels.length === 0) {
				alert('No channels selected for viewing!');
				return;
			}

			$$('.wv-item.active ! tr').each(function (row) {
                // 'chan' = NET_STA_CHAN_LOC  need to pick out the STA and CHAN_LOC pieces...
                var stachan = row.get('chan').split(/_(.*)/);
                stachan = stachan[1].split(/_(.*)/);
				staArr.push(stachan[0]);
				chanArr.push(stachan[1]);

				// nsamp and srate appear not to vary per chn
				nsamp = row.get('nsamp');
				srate = row.get('srate');
			});

            var multiSta = 0;
            for (var i=0; i <staArr.length -1; i++) {
               if (staArr[i] != staArr[i+1]) { multiSta=1; }
            }
            if (multiSta == 1) { alert("Viewing channels with different STA's in the same viewer-instance currently not supported.");  return; }

			for (var i = 0, j = app.Models.Events.toArray(), k = j.length;
					i < k; i++) {
				if (j[i].id === this.getCurrentEvent().evid) {
					evtTime = j[i].epoch;
				}
			}

			// Open WF Viewer
			window.open(app.settings.constructWF(
				staArr[0],
				chanArr,
				evtTime,
				nsamp,
				srate
			));
		},
		hide: function () {
			//this._slideObj.slideOut();
		    this._el.fade('hide');
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
			
			//this._slideObj = new Fx.Slide(this._el, {
         //       duration: 'short',
			//	hideOverflow: false,
         //       link: 'chain',
			//	mode: 'horizontal'
			//});
         this._el.fade('hide');
			//this._slideObj.hide();
			
			$('channel-close').addEvent('click', this.hide);
			$('chn-control-view').addEvent('click', this._viewSelected);
            
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

}) ();

var emptyPopUp = new PopUpWindow('Confirm Emptying Cart', { contentDiv: 'empty', width: '250', height: '100' });
var myPopUp = new PopUpWindow('My PopUp Window', { contentDiv: 'prevw', width: '250' });
function thumb(ddir, dfile, epch) {
   if ($('dsblPrevw').checked) {
      myPopUp.close();
   }
   else {
      // This next bit try to a quick and dirty management of the pop-up window's position...
      // When opening the first time, or if it seesm the open-window will be outside the browser
      //   then re-position to a home location which is just inside the top-left corner of the
      //   main div (#myEverything).
      var bwin = window.getSize();
      var pos  = myPopUp.windowDiv.getCoordinates();
      if ((ddir==-1) || (pos.top > (bwin.y-20)) || (pos.left > (bwin.x-20))) {
         var pos =  $('app-wrap').getCoordinates();
         var posY = pos.top  + 50;
         var posX = pos.left + 70;
         //myPopUp.open();
         myPopUp.windowDiv.style.top = posY + "px";
         myPopUp.windowDiv.style.left = posX + "px";
      }
      if ((!myPopUp.isOpen) && (ddir != -1)) { myPopUp.open(); }
      // Put the channel_evid# in the title bar and the image by way of php in the body...
      myPopUp.windowDiv.getElement('span').innerHTML = dfile;
      preview = document.getElementById("prevw");
      txt="<img src=" + Drupal.settings.drupal_path + "/thumbnial.php?ddir=" + ddir + "&file=" + dfile + "&time=" + epch;
      preview.innerHTML= "<img src='" + Drupal.settings.drupal_path + "/thumbnail.php?ddir=" + ddir + "&file=" + dfile + "&time=" + epch + "' width=250>";
   }
}

function hidePrev() {
   myPopUp.close();
}

function thumbnailInit() {
   thumb(-1,0,0);
}



