/* vim: set tabstop=4 shiftwidth=4: */
/*jslint mootools:true */
var app     =   window.app || (window.app = {}),
	_       =   window._,
	PubSub  =   window.PubSub;

/**
 * Handles application data
 * 
 * -----------------------------------------------------------------------------
 * Layout
 * -----------------------------------------------------------------------------
 * Model
 */
(function () {
	var Collection, events, channels, cart;
	
	// Initialize app.Models namespace
	app.Models = {};
	
	// Collection Class holds data models
	Collection = new Class({
		Implements: Options,
		options: {},
		
		initialize: function (options) {
			_.bindAll(this);
			this._meta = {};
			this._models = [];
			this.setOptions(options);
			
			if (this.options.fetchOn) {
				this.options.fetchOn.split(',').each(function (topic) {
					PubSub.subscribe(topic, this.fetch);
				}.bind(this));
			}
		},
		_objToStr: function (obj) {
			var values = [];
			
			for (var key in obj) {
				if (obj.hasOwnProperty(key)) {
					values.push(key + '=' + obj[key]);
				}
			}
			return values.join('&');
		},
		_processData: function (json) {
			this._meta      =   json.$meta;
			this._models	=   json.$data;
			
            // Create assoc array for easier id search
            if (typeof this.options.keyIndex != 'undefined') { // idx can be 0
                this._keyModels = {};
                for (var i = 0, j = this._models.length; i < j; i++) {
                    this._keyModels[this._models[i][this.options.keyIndex]] =
                        this._models[i];
                }
            }
            
			if (this.options.changed) {
				this.options.changed(this._models);
			}
		},
		create: function (model) {
			this._models.push(model);
		},
		fetch: function (obj) {
			var queryString = obj ? this._objToStr(obj) : '';
			
			new Request.JSON({
				method: app.DEBUG ? 'GET' : 'POST',
				onSuccess: this._processData,
				url: Drupal.settings.drupal_path + '/' + this.options.url + (app.DEBUG ? '.json' : '.php')
			}).send(queryString);
		},
		getMeta: function () {
			return this._meta;
		},
        get: function (k) {
            // Get model by key
            return (this._keyModels ? this._keyModels[k] : null);
        },
		toArray: function () {
			return this._models;
		}
	});
	
	events = new Collection({
		changed: function (data) {
			PubSub.publish('eventsUpdated', data);
		},
		fetchOn: 'inputChanged',
        keyIndex: 'id',
		url: 'events'
	});
	app.Models.Events = events;
	
	channels = new Collection({
		changed: function (data) {
			PubSub.publish('channelsUpdated', data);
		},
		fetchOn: 'eventSelected',
        keyIndex: 'chan',
		url: 'channels'
	});
	app.Models.Channels = channels;
	
	cart = {
		_data: {},
		add: function (evt, data, chn) {
			this._data[evt] || (this._data[evt] = {});
            Object.append(this._data[evt], data);
			this._data[evt].chnList || (this._data[evt].chnList = []);
            if (!this._data[evt].chnList.contains(chn)) {
                this._data[evt].chnList.push(chn);
            }
		},
		get: function (evt) {
			if (!this._data[evt] || this._data[evt] == {}) {
				return null;
			}
			return this._data[evt];
		},
		has: function (evt, chn) {
			return !!this._data[evt] && this._data[evt].chnList.contains(chn);
		},
		remove: function (evt, chn) {
			if (!this._data[evt] || !this._data[evt].chnList) return;
            
			this._data[evt].chnList.erase(chn);
            
			if (this._data[evt].chnList.length === 0) {
				delete this._data[evt];
			}
		},
        empty: function () {
            for (key in this._data) {
                delete this._data[key];
              }
        },
		toObj: function () {
			return this._data;
		}
	};
	app.Models.Cart = cart;

	// Local events from cookies
	PubSub.subscribe('cartUpdated', function (data) {
		window.localStorage.setItem('cartItems', JSON.encode(data));
	});

	window.addEvent('load', function () {
		if (window.localStorage.getItem('cartItems')) {
			cart._data = JSON.decode(window.localStorage.getItem('cartItems'));
			PubSub.publish('cartUpdated', cart._data);

                        for(var i=0, chnCnt = 0, siteEvt = Object.keys(cart._data); i < siteEvt.length; i++) {
                          chnCnt += cart._data[siteEvt[i]]['chnList'].length;
                        }
                        if ((i + chnCnt) == 0) {
                           $('in-cart').innerHTML = "(Cart empty)";
                        }
                        else {
                           $('in-cart').innerHTML = "(" + chnCnt + " Chans from " + i + " Events)";
                        }

		}
	});
	
}) ();
